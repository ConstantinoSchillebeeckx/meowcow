function gui() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------
    var options = false,
        container = false,
        renderCallback = false // to be called by "Render button"

    this.init = function() {
        var ready = buildSkeleton(this.container)
        if (ready) populateGUI(this.options);
    }

    /**
     * Check GUI for errors in option choices, if
     * an error exists, display a warning
     *
     * @param {obj} guiVals - return from getGUIvals()
     * @param {obj} unique - return of getAllUnique()
     *
     * @return true on error, false on no error
     */
    this.guiWarnings = function(guiVals, unique) {

        var setupVals = guiVals[setupTab.replace('#','')];
        var facetVals = guiVals[facetsTab.replace('#','')];
        var hVal = facetVals['horizontal-facet'].value
        var hLabel = facetVals['horizontal-facet'].label
        var vVal = facetVals['vertical-facet'].value
        var vLabel = facetVals['vertical-facet'].label

        if (setupVals['x-axis'].label == setupVals['y-axis'].label) { // ensure x & y axis are different
            displayWarning("The X-axis field cannot be the same as the Y-axis field, please change one of them!", '#warningCol', true);
            return true;
        }

        if (hVal || vVal) {

            var facetRows = (hVal) ? unique[hLabel] : [null];
            var facetCols = (vVal) ? unique[vLabel] : [null];

            if (guiVals.facetCol.value === null && guiVals.facetRow.value === null && guiVals.colWrap.value === null) {
                displayWarning("In order to use facets, you must at least choose something for <code>Rows</code> or <code>Columns</code>", true);
                return true;
            }
            if (facetRows.length > 50 || facetCols.length > 50) { // limit how many facets can be rendered
                displayWarning("Cancelling render because too many facets would be created.", true);
                return true;
            }
            if (guiVals.colWrap.value > 0 && guiVals.facetRow.value !== null) {
                displayWarning("You cannot specify both a <code>Rows</code> and <code>Columns</code> option when specifying <code>Column wrap</code>.", true);
                return true;
            }
            if (guiVals.facetRow.label === guiVals.facetCol.label) {
                displayWarning("You cannot choose the same field for both <code>Rows</code> and <code>Columns</code> options.", true);
                return true;
            }
        }
        return false;
    }



    /**
     * Call to serializeArray() on the GUI form to return
     * all the current settings of the GUI. 
     *
     * A select option of 'None' will return as null.
     * A checked checkbox will return as true, otherwise false
     *
     * @param {string} sel - selector for form that contains form inputs
     *
     * @return {object} - object of tab gui values with each tab ID
     *   as a key, the value of which are the input values. Inner
     *   object has input id as the key and values are:
     *   - for select dropdowns, the value is as object of form
     *     {label: XX, value: XX}. note that for the 'None' options
     *     the value will both be null
     *   - for checkboxes, the value will be true/false
     *   - for sliders the value will be an array of either length
     *     1 for a single value slider, or 2 for a min/max slider
     *
     */
    this.getGUIvals = function(sel) {

        var guiVals = {};
        jQuery(sel + ' div.tab-pane').each(function() {
            var tab = this.id;
            guiVals[tab] = {};

            // parse select inputs
            var tmp = jQuery(this).find(':input').serializeArray();

            tmp.forEach(function(d) {
                var value = d.value;
                var name = d.name;
                guiVals[tab][name] = {}
                guiVals[tab][name]['value'] = (value == '' || value == "None") ? null : convertToNumber(value);
                guiVals[tab][name]['label'] = jQuery("#" + name + " option:selected").text();
            });

            // parse checkboxes
            var checkBoxes = jQuery(this).find('input[type="checkbox"]');
            if (checkBoxes.length) {
                checkBoxes.each(function(d) {
                    guiVals[tab][this.id] = this.checked;
                })
            }

            // parse slider values
            if (tab in sliderValues) {
                for (var slider in sliderValues[tab]) {
                    guiVals[tab][slider] = sliderValues[tab][slider];
                }
            }
        })


        return guiVals;

    }



    //============================================================
    // Private Variables
    //------------------------------------------------------------
    var plotTypesID = '#plotTypes',
        setupTab = '#plotSetup',
        facetsTab = '#plotFacets',
        optionsTab = '#plotOptions',
        filtersTab = '#plotFilter',
        sliderValues = {} // keeps track of all current slider values

    $('.nav-tabs a').click(function (e) {
        e.preventDefault()
        jQuery(this).tab('show')
    })

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
        jQuery(setupTab).tab('show');
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
                generateFormSelect(cols, setupTab, d +"-axis", label, false, domClass);
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

            // add tab and container
            addTab(facetsTab, 'Facets');

            var dir = ['horizontal','vertical'];

            dir.forEach(function(d) {
                var cols = getCols('ordinal');
                generateFormSelect(cols, facetsTab, d+'-facet', d, {'None':''});
            });
        } else {
            d3.select(facetsTab).style('display','hidden');
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

            // add tab and container
            addTab(optionsTab, 'Options');

            plotOptions.forEach(function(d) {
                if (d.type == 'select') {
                    generateFormSelect(d.values, optionsTab, d.name, d.label, d.allowEmpty, d.domClass);
                } else if (d.type == 'toggle') {
                    generateFormToggle(optionsTab, d.name, d.label, d.domClass, d.options); // TODO width of toggle not being calculated - I think it's due to the tabs
                } else if (d.type == 'slider') {
                    generateFormSlider(optionsTab, d.name, d.label, d.domClass, d.options, d.format);
                }
            })

        } else {
            d3.select(optionsTab).style('display','hidden');
        }
    }


    /**
     *
     */
    function setupPlotFilters() {

        if (typeof unique !== 'undefined') { // unique is a global set with preLoad()

            // add tab and container
            addTab(filtersTab, 'Filters');

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
                    generateFormSlider(filtersTab, col+'Filter', col, false, sliderOptions, format);
                } else if (colType == 'str') {
                    generateFormSelect(colVals, filtersTab, col+'Filter', col, 'All'); // TODO this will potentially generate a select with a ton of options ...
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
     * If the globals 'dat' & 'unique' aren't set, tabs won't be generated,
     * instead a message is displayed with an upload button that calls
     * uploadData()
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
     *
     * @return {bool} - true if all data is ready and skeleton has been
     *   generated; false if data globals (dat & unique) don't exist
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
            .attr("class","col-sm-12")
            .attr("id","warningCol");


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
            .attr('class','panel-collapse collapse in panel-body')
            .append('form')

        if (!checkIfReady()) {
            var uploadText = "Looks like you don't have any data loaded, would you like to upload some now?";
            var row = form.append('div')
                .attr('class','row')
                .append('div')
                .attr('class','col-sm-12')

            row.append('p')
                .attr('class','lead')
                .text(uploadText)
            
            row.append('button')
                .attr('class','btn btn-primary')
                .attr('type','button')
                .text('Upload')
                .on('click', uploadData)
            return false;
        }

        // tabs live here
        form.append('ul')
            .attr('class','nav nav-tabs')
            .attr('role','tablist')

        form.append('div')
            .attr('class','tab-content')

        form.append('hr')

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

        return true;
    }


    /**
     * onClick event handler for uploading data, called
     * when users clicks button when globals dat & unique
     * aren't loaded yet
     */
    function uploadData() {

    }


    /**
     * Ensure all global data are set including dat & unique
     *
     * Returns true if all data ready; false otherwise
     */
    function checkIfReady() {

        if (typeof dat === 'undefined' && typeof unique === 'undefined') {
            return false;
        } else {
            return true;
        }
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
                start:[50],
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
        var tabName = selector.replace('#','');
        if (!(tabName in sliderValues)) sliderValues[tabName] = {};
        sliderValues[tabName][id] = options.start; 

        // add event listener for slider change
        slider.noUiSlider.on('slide', function(d) {
            jQuery('#' + id + 'Val').text(format(d));
            sliderValues[id] = d.apply(convertToNumber);
        });
    }


    /**
     * Convert string to either an int, float
     * or leave as string
     *
     * @param {string} str - input string to convert
     *
     * @return - either a float, int or string
    */

    function convertToNumber(str) {

        var convert = str * 1;

        return (isNaN(convert)) ? str : convert;

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
                value = Object.values(addOption)[0];
                text = Object.keys(addOption)[0];
            }
            jQuery('#' + id).prepend('<option value="' + value + '">' + text + '</option>').val($("#" + id + " option:first").val());
        }

        return select;

    }

    /**
     * Append a tab to the GUI, assume ul .nav already exists
     */
    function addTab(id, text, active) {
        // setup plot basics tab
        d3.select('.nav').append('li')
            .attr('role','presentation')
            .attr('class', function() { return active ? 'active' : null})
            .attr('id',id+'Tab')
            .append('a')
            .attr('role','tab')
            .attr('data-toggle','tab')
            .attr('href',id)
            .text(text)

        d3.select('.tab-content').append('div')
            .attr('role','tabpanel')
            .attr('class', function () { return active ? 'tab-pane row active' : 'tab-pane row'})
            .attr('id',id.replace('#',''))

    }

 
    /**
     * Parse GUI options and generate all DOM elements
     */
    function populateGUI(options) {
        if (!options) displayWarning("You must first set the <code>options</code> attribute before building the GUI", false, true);

        addTab(setupTab, 'Setup', true);
        generateFormSelect(plotTypes(), setupTab, plotTypesID.replace('#',''), "Plot type")
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



}
