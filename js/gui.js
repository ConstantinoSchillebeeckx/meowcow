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
        var wrapVal = facetVals.colWrap.value;

        if (setupVals['x-axis'].label == setupVals['y-axis'].label) { // ensure x & y axis are different
            displayWarning("The X-axis field cannot be the same as the Y-axis field, please change one of them!", '#warningCol', true);
            return true;
        }

        // check that selected plot type is an option in nv.models (should be a key)

        if (facetVals.facetOn || wrapVal > 0) {
            var hVal = facetVals['horizontal-facet'].value
            var hLabel = facetVals['horizontal-facet'].label
            var vVal = facetVals['vertical-facet'].value
            var vLabel = facetVals['vertical-facet'].label
            var facetRows = (hVal) ? unique[hLabel] : [null];
            var facetCols = (vVal) ? unique[vLabel] : [null];

            if (hVal === null && vVal === null && wrapVal === null) {
                displayWarning("In order to use facets, you must at least choose something for <code>Rows</code> or <code>Columns</code>", '#warningCol', true);
                return true;
            }
            if (wrapVal > 0 && vVal !== null) {
                displayWarning("You cannot specify a <code>Rows</code> option when specifying <code>Column wrap</code>.", '#warningCol', true);
                return true;
            }
            if (vLabel === hLabel) {
                displayWarning("You cannot choose the same field for both <code>Rows</code> and <code>Columns</code> options.", '#warningCol', true);
                return true;
            }
            if (facetRows.length > 50 || facetCols.length > 50) { // limit how many facets can be rendered
                displayWarning("Cancelling render because too many facets would be created.", '#warningCol', true);
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

            // set a bool for facets on/off
            if (tab == 'plotFacets') {
                guiVals['plotFacets'].facetOn = (guiVals['plotFacets']['horizontal-facet'].value !== null || guiVals['plotFacets']['vertical-facet'].value !== null)
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
     * keys will be the plot type label, and values will be the name
     */
    var plotTypes = function() { 
        var tmp = {}; 
        for (var d in options.plotTypes) {
            var dat = options.plotTypes[d];
            tmp[d] = 'label' in dat ? dat.label : dat.name;
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
     *   (int, float) or ordinal (str, datetime); if not provided, will return
     *   options.colMap
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
                var axisSetup = getAxisSetup(d);
                var cols = getCols(axisSetup.type);
                var label = "name" in axisSetup ? axisSetup.name : d.toUpperCase()+"-axis";
                var domClass = d == 'z' ? 'col-sm-4 col-sm-offset-4' : 'col-sm-4';
                generateFormSelect(cols, setupTab, d +"-axis", label, (d=='z') ? {'None':null} : false, domClass);
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
                generateFormSelect(cols, facetsTab, d+'-facet', (d == 'horizontal') ? 'Columns' : 'Rows', {'None':''});
            });

            generateFormTextInput(facetsTab, 'colWrap', 'Column wrap', false, 'number');
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
                    generateFormSelect(d.values, optionsTab, d.accessor, d.label, d.allowEmpty, d.domClass);
                } else if (d.type == 'toggle') {
                    generateFormToggle(optionsTab, d.accessor, d.label, d.domClass, d.options); // TODO width of toggle not being calculated - I think it's due to the tabs
                } else if (d.type == 'slider') {
                    generateFormSlider(optionsTab, d.accessor, d.label, d.domClass, d.options, d.format);
                }
            })

        } else {
            d3.select(optionsTab).style('display','hidden');
        }
    }


    /**
     * // TODO
     */
    function setupPlotFilters() {

        var slider, select;

        // unique is a global set with preLoad()
        // it is required in order to set all the filter limits
        if (typeof unique !== 'undefined') {

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
                    slider = generateFormSlider(filtersTab, col+'Filter', col, 'col-sm-4 filterInput', sliderOptions, format);
                    slider.noUiSlider.on('start',function() { showResetButton() }); // activate reset button
                } else if (colType == 'str') {
                    select = generateFormSelect(colVals, filtersTab, col+'Filter', col, 'All', 'col-sm-4 filterInput'); // TODO this will potentially generate a select with a ton of options ...
                    select.on('input',function() { showResetButton() }); // activate reset button
                } else if (colType == 'datetime') {
                }
            }
    
            // filter reset button
            d3.select(filtersTab)
                .append('div')
                .attr('class','form-group col-sm-4')
                .append('button')
                .attr('id','resetBtn')
                .attr('class','btn btn-warning btn-xs') // TODO weird alignment, should be all the way left
                .attr('disabled','disabled')
                .style('display','none')
                .on('click', resetFilters)
                .text('Reset');

        }
    }

    /**
     * remove read-only from reset button and show it
     */
    function showResetButton() {
        jQuery('#resetBtn').attr('disabled',false)
            .show();
    }


    /**
     * on click event handler to reset all filters to 'default'
     * values - in this case default means the first option
     * for a select, and min/max values for sliders.
     */
    function resetFilters() {

        // reset sliders
        for (var col in getCols()) {
            var colType = getColType(col);
            if (colType == 'int' || colType == 'float') {

                var slider = d3.select('#'+col+'FilterSliderWrap').node()
                var colVals = d3.extent(unique[col]);
                slider.noUiSlider.set(colVals);
            }
        }

        // reset all select to first option
        jQuery(filtersTab + ' select').prop("selectedIndex", 0);

        // reset button to read only and hide
        d3.select('#resetBtn')
            .attr('disabled','disabled')
            .style('display','none');
        return false;
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
            .attr('id','renderBtn')
            .on('click', renderCallback)

        return true;
    }


    /**
     * onClick event handler for uploading data, called
     * when users clicks button when globals dat & unique
     * aren't loaded yet
     */
    function uploadData() {
        // TODO
        return false;
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
     *
     * @return slider (node) on which one can attach events
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
        label = typeof label === 'undefined' ? id : label; // in case label not set in options, use the id
        var formGroup = inputHeader(selector, domClass, id, label);

        formGroup.append('span')
            .attr('class','muted')
            .attr('id',id+'Val')
            .text(format(options.start));

        var slider = formGroup.append('div')
            .attr('id',id+'SliderWrap')
            .node()

        // generate slider
        noUiSlider.create(slider, options);
        var tabName = selector.replace('#','');
        if (!(tabName in sliderValues)) sliderValues[tabName] = {};
        sliderValues[tabName][id] = options.start; 

        // add event listener for slider change
        slider.noUiSlider.on('slide', function(d) {
            jQuery('#' + id + 'Val').text(format(d)); // update displayed value
            var tabName = jQuery('#' + id + 'Val').closest('.tab-pane').attr('id');
            sliderValues[tabName][id] = d.map(function(e) { return convertToNumber(e); });
        });

        return slider;
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
    function inputHeader(selector, domClass, id, label) {
        var formGroup = d3.select(selector).append('div')
            .attr('class', 'form-group ' + domClass)
        
        formGroup.append('label')
            .attr('for',id)
            .html(label)

        return formGroup;
    }

    /**
     * Generate a bootstrap toggle input
     *
     * @param {string} selector - element to which to add form-group (label and select)
     * @param {string} id - id/name to give to toggle
     * @param {string} label - label text
     * @param {str} domClass - (optional, default=col-sm-4) class to assign to 
     *   div containing input, should be a boostrap column class type (e.g. col-sm-3)
     * @param {obj} options - toggle options, see http://www.bootstraptoggle.com/ API
     */
    function generateFormToggle(selector, id, label, domClass, options) {

        if (typeof domClass === 'undefined' || !domClass) domClass = 'col-sm-2';
        label = typeof label === 'undefined' ? id : label; // in case label not set in options, use the id
        var formGroup = inputHeader(selector, domClass, id, label);
            
        formGroup.append('br')

        var toggle = formGroup.append('input')
            .attr('type','checkbox')
            .attr('data-toggle','toggle')
            .attr('id',id)
            .attr('name',id);

        jQuery('input#'+id).bootstrapToggle(options); //activate
    }


    /**
     * Generate a text input
     *
     * @param {string} selector - element to which to add form-group (label and select)
     * @param {string} id - id/name to give to input
     * @param {string} label - label text
     * @param {str} domClass - (optional, default=col-sm-4) class to assign to 
     *   div containing input, should be a boostrap column class type (e.g. col-sm-3)
     * @param {str} type - type of input, 'text' or 'number'
     */
    function generateFormTextInput(selector, id, label, domClass, type) {

        if (typeof domClass === 'undefined' || !domClass) domClass = 'col-sm-4';
        if (typeof type === 'undefined' || !type) type = 'text';
        label = typeof label === 'undefined' ? id : label; // in case label not set in options, use the id
        var formGroup = inputHeader(selector, domClass, id, label);
            
        var textInput = formGroup.append('input')
            .attr('class','form-control')
            .attr('type',type)
            .attr('id',id)
            .attr('name',id)
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
     * @param {string} id - id/name to give to select
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
        label = typeof label === 'undefined' ? id : label; // in case label not set in options, use the id

        var formGroup = inputHeader(selector, domClass, id, label);

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
            jQuery('#' + id).prepend('<option value="' + value + '">' + text + '</option>').val(jQuery("#" + id + " option:first").val());
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
