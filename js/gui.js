function gui() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------
    var options = false,
        container = false,
        renderCallback = false, // to be called by "Render button"
        onComplete = false // to be called after GUI is setup

    this.init = function() {
        buildSkeleton(this.container)
        populateGUI(this.options);
    }





    //============================================================
    // Private Variables
    //------------------------------------------------------------
    var plotTypesID = '#plotTypes',
        guiRowPlotBasics = '#plotSetup',
        guiRowPlotFacets = '#plotFacets',
        guiRowPlotOptions = '#plotOptions',
        guiRowPlotFilters = '#plotFilter'


    /**
     * Get the currently selected plot type
     */
    var getPlotType = function() { return jQuery(plotTypesID).val(); }

    /**
     * Return an obj of plotTypes available in the specified options
     * keys will be the plot type lable, and values will be the name
     */
    var plotTypes = function() { 
        var tmp = {}; 
        for (var d in options.plotTypes) {
            var dat = options.plotTypes[d];
            tmp[dat.name] = 'label' in dat ? dat.label : dat.name;
        }
        return tmp;
    };

    /**
     * Return an array of columns (defined as keys in options.colMap)
     * that match the given column type as defined by the datatypes
     * in options.colMap or the available data columns as an object
     * if no type is passed
     *
     * @param {str} type - [optional] type of columns requested, either interval
     *   (int, float) or ordinal (str, datetime)
     *
     * @return {array/obj} 
     *  - column names that match column type
     *  - obj of available data columns if no type provided
     */
    var getCols = function(type) { // return colMap keys that match the given type [interval/ordinal]
        var colMap = options.colMap;
        if (typeof type !== 'undefined') {
            var filter = type == 'interval' ? ['int','float'] : ['datetime','str'];
            return Object.keys(colMap).filter(function(e) { return filter.indexOf(colMap[e].type) != -1  })
        } else { // remove 'excluded' column types from colMap
            var tmp = {};
            for (var key in colMap) {
                if (colMap[key].type !== 'excluded') tmp[key] = colMap[key];
            }
            return tmp;
        }
    };

    var getColType = function(col) {
        return options.colMap[col].type
    }

    var getAxisSetup = function(axis) {
        return getPlotSettings().setup[axis];
    }

    var getAvailableAxes = function() {
        return Object.keys(getPlotSettings().setup);
    }

    var getPlotSettings = function() {
        return options.plotTypes[getPlotType()];
    }

    var getAllowFacets = function() {
        return getPlotSettings().allowFacets;
    }

    var getPlotOptions = function() {
        return getPlotSettings().options;
    }


    /**
     * Return an object to populate the allowable columns needed
     * for the axis given the axis type
     *
     * @param {str} axisName - the name of the axis being populated,
     *  must be a key in options.plotTypes[plotType].setup
     */
    var getAxisCols = function(axisName) {
        var axisType = options.plotTypes[getPlotType()].setup[axisName].type;
        return getCols(axisType);
    }

    /**
     * Function that's called each time the plotType changes;
     * it will update all the form inputs to their proper  
     * values including plot basics, plot facets, plot options
     * and plot filters
     */
    function plotTypeChange() {
        setupPlotBasics();
        setupPlotFacets();
        setupPlotOptions();
        setupPlotFilters();
    }


    /**
     * called on each plot type change, shows the proper x,y,z,
     * select options that will define the plots axes
     */
    function setupPlotBasics() {

        var axes = ['x','y','z'];
        var availableAxes = getAvailableAxes()

        axes.forEach(function(d) {
            if (availableAxes.indexOf(d) !== -1) {
                var cols = getCols(getPlotType(), d);
                var label = "name" in getAxisSetup(d) ? getAxisSetup(d).name : d.toUpperCase()+"-axis";
                var domClass = d == 'z' ? 'col-sm-4 col-sm-offset-4' : 'col-sm-4';
                generateFormSelect(cols, guiRowPlotBasics, d +"-axis", label, false, domClass);
            }
        });
    }

    /**
     * called on each plot type change, shows the proper inputs
     * for the requested plot type based on the defined plot
     * options and whether allowFacets = true, if false
     * the row will be hidden
     */
    function setupPlotFacets() {

        if (getAllowFacets()) {
            d3.select(guiRowPlotFacets).style('display',null);
            var dir = ['horizontal','vertical'];

            dir.forEach(function(d) {
                var cols = getCols('ordinal');
                generateFormSelect(cols, guiRowPlotFacets, d+'-facet', d);
            });
        } else {
            d3.select(guiRowPlotFacets).style('display','hidden');
        }
    }

    /**
     * called on each plot type change, shows the proper inputs
     * for the requested plot type based on the defined plot
     * options.
     */
    function setupPlotOptions() {
        var plotOptions = getPlotOptions();
        if (plotOptions) {

            d3.select(guiRowPlotOptions).style('display',null);

            plotOptions.forEach(function(d) {
                if (d.type == 'select') {
                    generateFormSelect(d.values, guiRowPlotOptions, d.name, d.label, d.allowEmpty, d.domClass);
                } else if (d.type == 'toggle') {
                    generateFormToggle(guiRowPlotOptions, d.name, d.label, d.domClass, d.options);
                } else if (d.type == 'slider') {
                    generateFormSlider(guiRowPlotOptions, d.name, d.label, d.domClass, d.options, d.format);
                }
            })

        } else {
            d3.select(guiRowPlotOptions).style('display','hidden');
        }
    }


    /**
     *
     */
    function setupPlotFilters() {

        if (typeof unique !== 'undefined') { // unique is a global set with preLoad()
            d3.select(guiRowPlotFilters).style('display',null);
            var colMap = getCols();

            for (var col in colMap) {
                var colType = getColType(col);
                var colVals = unique[col];
                if (colType == 'int' || colType == 'float') {
                    colVals = d3.extent(unique[col]);
                    var sliderOptions = {
                        start: [colVals[0], colVals[1]],
                        connect: true,
                        range: {
                            min: colVals[0],
                            max: colVals[1],
                        }
                    };

                    var format;
                    if (colType == 'int') {
                        format = colMap[col].format ? colMap[col].format : function(d) { return '[' + parseInt(d[0]) + ',' + parseInt(d[1]) + ']' };
                    } else if (colType == 'float') {
                        format = colMap[col].format ? colMap[col].format : function(d) { return '[' + parseFloat(d[0]).toFixed(2) + ',' + paraseFloat(d[1]).toFixed(2) + ']'; };
                    }
                    generateFormSlider(guiRowPlotFilters, col+'Filter', col, false, sliderOptions, format);
                } else if (colType == 'str') {
                    generateFormSelect(colVals, guiRowPlotFilters, col+'Filter', col, 'All'); // TODO this will potentially generate a select with a ton of options ...
                } else if (colType == 'datetime') {
                }
            }
        }
    }

    /** 
     * Build the GUI bootstrap panel and form including the warnings DOM.
     *
     * Will setup all the proper DOM elements for the GUI including
     * - a bootstrap row (#guiRow) that is set as a full width column
     * - a bootstrap row (#warningsRow)
     *
     * The GUI is further madeup of various sections defined as rows:
     * - #plotSetup: contains all the selects to define the plot type
     *   as well as the axis definitions.
     * - #plotFacets: contains selects for defining the facets of the
     *   plot
     * - #plotOptions: contains all teh selects to set the options for
     *   the given plotType
     * - #plotRender: contains the render button
     *
     * NOTE: by default all the rows are style display:none
     *
     * @param {str} selector - class or id of DOM in which to build GUI
     */
    function buildSkeleton(selector) {

        if (!selector) displayWarning("You must first set the <code>container</code> attribute before building the GUI", false, true);

        // setup containers
        var container = d3.select(selector);

        var guiRow = container.append("div")
            .attr("class","row")
            .attr("id","guiRow");
        var guiCol = guiRow.append("div")
            .attr("class","col-sm-12");

        var warningsRow = container.append("div")
            .attr("class","row")
            .attr("id","warningsRow");
        var warningsCol = warningsRow.append("div")
            .attr("class","col-sm-12");


        // setup panel
        var panel = guiCol.append('div')
            .attr('class', 'panel panel-default')

        panel.append('div')
            .attr('class','panel-heading')
            .append('h4')
            .attr('class','panel-title')
            .append('a')
            .attr('role','button')
            .attr('data-toggle','collapse')
            .attr('data-parent','#gui')
            .attr('href','#guiBody')
            .text('GUI')

        var form = panel.append('div')
            .attr('id','guiBody')
            .attr('class','panel-collapse collapse in')
            .append('div')
            .attr('class','panel-body')
            .append('form')


        // options for plot basics
        var inputRowSetup = form.append('div')
            .attr('class','row')
            .attr('id',guiRowPlotBasics.replace('#',''))
            .style('display', 'none')
            .append('div')
            .attr('class','col-sm-12')
            .append('h3').text('Basics')
            .append('div')
            .attr('class','row')


        // options for specifying row/col facets
        var inputRowFacet = form.append('div')
            .attr('id',guiRowPlotFacets.replace('#',''))
            .attr('class','row')
            .style('display', 'none')
            .append('hr')
            .append('div')
            .attr('class','col-sm-12')
            .append('h3').text('Facets')
            .append('div')
            .attr('class','row')

        // options for specifying plot options
        var inputRowOptions = form.append('div')
            .attr('class','row')
            .attr('id',guiRowPlotOptions.replace('#',''))
            .style('display', 'none')
            .append('div')
            .attr('class','col-sm-12')
            .append('h3').text('Options')
            .append('div')
            .attr('class','row')

        // options for filtering data
        var inputRowFilters = form.append('div')
            .attr('class','row')
            .attr('id',guiRowPlotFilters.replace('#',''))
            .style('display', 'none')
            .append('div')
            .attr('class','col-sm-12')
            .append('h3').text('Data filters')
            .append('div')
            .attr('class','row')

        // submit button
        form.append('div')
            .attr('class','row')
            .attr('id','plotRender')
            .append('div')
            .attr('class','col-sm-12')
            .append('button')
            .attr('class','btn btn-primary pull-right')
            .attr('type','button')
            .text('Render')
            .on('click', renderCallback)

    }

    /**
     * Display a dismissible alert inside a div
     *
     * @param {str} message - message to display
     * @param {str} selector - class or id of dom in which to display message
     *   if not provided, a #warning div will be generated
     * @param {bool} error [optional] - if true
     *  alert class will be .alert-danger (red), otherwise
     *  class will be .alert-warning
     *
     * @return void
    */
    function displayWarning(message, selector=false, error=false) {

        if (typeof error == 'undefined') error = false;

        // generate wrapper if it doesn't exist
        if (!selector) {
            d3.select("body").append("div").attr("id","warning")
            selector = "#warning";
        }


        if (error) {
            var tmp = '<div class="alert alert-danger alert-dismissible" role="alert">';
        } else {
            var tmp = '<div class="alert alert-warning alert-dismissible" role="alert">';
        }
        tmp += '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>';
        tmp += message;
        tmp += '</div>';
        d3.select(selector).html(tmp);
    }

    /**
     * Generate a noUiSlider range input
     *
     * @param {string} selector - element to which to add form-group (label and select)
     * @param {string} id - id to give to toggle
     * @param {string} label - label text
     * @param {str} domClass - (optional, default=col-sm-4) class to assign to 
     *   div containing input, should be a boostrap column class type (e.g. col-sm-3)
     * @param {obj} options - toggle options, see http://www.bootstraptoggle.com/ API
     * @param {funct} format - function to format slider value; defaults to "[val]"
     */
    function generateFormSlider(selector, id, label, domClass, options, format) {

        if (typeof domClass === 'undefined' || !domClass) domClass = 'col-sm-4';
        if (typeof format === 'undefined') format = function(d) { return '[' + d + ']'; };
        if (typeof options === 'undefined' || !options) {
            options = { // default slider if no options provided
                start:50,
                step: 1,
                range: {
                    min: 0,
                    max: 100
                }
            };
        }
        id = typeof label == 'undefined' ? id : label;
        var formGroup = inputHeader(selector, domClass, id);

        formGroup.append('span')
            .attr('class','muted')
            .attr('id',id+'Val')
            .text(format(options.start));

        var slider = formGroup.append('div')
            .attr('id','sliderWrap')
            .node()

        // generate slider
        noUiSlider.create(slider, options);

        // add event listener for slider change
        slider.noUiSlider.on('slide', function(d) {
            jQuery('#' + id + 'Val').text(format(d));
        });
    }

    /**
     * Add DOM header elements for each form input
     * including a bootstrap form-group with label
     */
    function inputHeader(selector, domClass, id) {
        var formGroup = d3.select(selector).append('div')
            .attr('class', 'form-group ' + domClass)
        
        formGroup.append('label')
            .attr('for',id)
            .html(id)

        return formGroup;
    }

    /**
     * Generate a bootstrap toggle input
     *
     * @param {string} selector - element to which to add form-group (label and select)
     * @param {string} id - id to give to toggle
     * @param {string} label - label text
     * @param {str} domClass - (optional, default=col-sm-4) class to assign to 
     *   div containing input, should be a boostrap column class type (e.g. col-sm-3)
     * @param {obj} options - toggle options, see http://www.bootstraptoggle.com/ API
     */
    function generateFormToggle(selector, id, label, domClass, options) {

        if (typeof domClass === 'undefined' || !domClass) domClass = 'col-sm-2';
        id = typeof label == 'undefined' ? id : label;
        var formGroup = inputHeader(selector, domClass, id);
            
        formGroup.append('br')

        var toggle = formGroup.append('input')
            .attr('type','checkbox')
            .attr('data-toggle','toggle')
            .attr('id',id)

        jQuery('input#'+id).bootstrapToggle(options); //activate
    }

    /**
     * Generate a select used in a form along with the label. Note that DOM generated
     * by this function will be assigned a col-sm-4 class.
     *
     * The 'value' setting for each item in the select will be set to the SQL column
     * type e.g. str, float, datetime, int
     *
     * @param {array/obj}  vals - list of options to populate select with. If an
     *   array is passed, both the select value and text will be the set with the
     *   array elements; if an object is passed keys will be the option value and
     *   obj values will be the option text.
     * @param {string} selector - element to which to add form-group (label and select)
     * @param {string} id - id to give to select
     * @param {string} label - label text
     * @param {str/obj} addOption - (optional, default=False) whether to prepend an additional
     *  in the select list, allows for things like 'All' or 'None' - note this will be the first option
     * @param {str} domClass - (optional, default=col-sm-4) class to assign to 
     *   div containing input, should be a boostrap column class type (e.g. col-sm-3)
     *
     * @return select DOM
     *
     */
    function generateFormSelect(vals, selector, id, label, addOption, domClass) {

        if (typeof addOption === 'undefined') addOption = false;
        if (typeof domClass === 'undefined' || domClass == false) domClass = 'col-sm-4';

        var formGroup = d3.select(selector).append('div')
            .attr('class', 'form-group ' + domClass)
        
        formGroup.append('label')
            .attr('for',id)
            .html(typeof label == 'undefined' ? id : label)

        var select = formGroup.append('select')
            .attr('class','form-control')
            .attr('id',id)
            .attr('name',id)

        select.selectAll('option')
            .data(Array.isArray(vals) ? vals : Object.keys(vals)).enter()
            .append('option')
            .text(function (d,i) { return Array.isArray(vals) ? d : Object.values(vals)[i]; })
            .attr('value', function (d) { return d; });

        // prepend option to select
        if (addOption) {
            var value = '';
            var text = '';
            if (typeof addOption !== 'object') {
                value = addOption;
                text = addOption;
            } else {
                value = Object.keys(addOption)[0];
                text = Object.keys(addOption)[1];
            }
            jQuery('#' + id).prepend('<option value="' + value + '">' + text + '</option>').val(value);
        }

        return select;

    }

 
    /**
     * Parse GUI options and generate all DOM elements
     */
    function populateGUI(options) {

        if (!options) displayWarning("You must first set the <code>options</code> attribute before building the GUI", false, true);

        // setup plot basics
        d3.select(guiRowPlotBasics).style('display',null);
        generateFormSelect(plotTypes(), guiRowPlotBasics, plotTypesID.replace('#',''), "Plot type")
        d3.select(plotTypesID).on('change', plotTypeChange);

        plotTypeChange(); // fire to select first plot type
    }


    //============================================================
    // Expose Public Variables
    //------------------------------------------------------------    
    Object.defineProperty(this,"options",{
        get: function() { return options; }, set: function(_) { options = _; }
    });
    Object.defineProperty(this,"container",{
        get: function() { return container; }, set: function(_) { container = _; }
    });
    Object.defineProperty(this,"renderCallback",{
        get: function() { return renderCallback; }, set: function(_) { renderCallback = _; }
    });
    Object.defineProperty(this,"onComplete",{
        get: function() { return onComplete; }, set: function(_) { onComplete = _; }
    });



}
