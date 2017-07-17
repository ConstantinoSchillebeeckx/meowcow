/*
TODO
- date picker
- gui setup validation function (needs to be validated against uploaded data)
- implement filtering
- loading in main plot area
*/

var chartArray = []; // keep chart objects here so that we can call chart.update();
var guiFacetCols, guiFacetRows, guiFacetWrap;

function gui() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------
    var options = false,
        container = false,
        canvas = false,
        data = false,
        ignoreCol = [],
        colTypes

    /**
     * TODO
     */
    this.init = function() {

        if (checkIfReady()) {
            buildSkeleton(container)
            colTypes = findColumnTypes(data, ignoreCol, colTypes);
            unique = getAllUnique(data, colTypes);
            populateGUI(options);
        }
    }


    //============================================================
    // Private Variables
    //------------------------------------------------------------
    var plotTypesID = '#plotTypes',
        setupTab = '#plotSetup',
        facetsTab = '#plotFacets',
        optionsTab = '#plotOptions',
        filtersTab = '#plotFilter',
        sliderValues = {}, // keeps track of all current slider values {tabName: {sliderName: val}, ...}
        unique = false,
        colTypes = false

    /**
     * Check GUI for errors in option choices, if
     * an error exists, display a warning
     *
     * @param {obj} guiVals - return from getGUIvals()
     *
     * @return true on error, false on no error
     */
     function guiWarnings(guiVals) {

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
    function getGUIvals(sel) {

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


    /**
     * Get the currently selected plot type
     */
    var getPlotType = function() { return jQuery(plotTypesID).val(); }

    /**
     * Return an obj of plotTypes available in the specified options.
     * obj keys will be the plot type select value,
     * obj values will be the select label
     */
    var plotTypes = function() { 
        var tmp = {}; 
        for (var value in options.plotTypes) {
            var dat = options.plotTypes[value];
            var key = 'label' in dat ? dat.label : dat.name;
            tmp[key] = value;
        }
        return tmp;
    };

    /**
     * Return an array of columns in the loaded dataset
     * that match the requested data type
     *
     * @param {str} type - type of columns requested, either interval
     *   (int, float) or ordinal (str, datetime); if not provided, will return
     *   colTYpes
     *
     * @return {array/obj} 
     *  - column names that match column type
     *  - obj of available data columns if no type provided
     */
    var getCols = function(type) { // return colTypes keys that match the given type [interval/ordinal]
        if (typeof type !== 'undefined') {
            var filter = type == 'interval' ? ['int','float'] : ['datetime','str'];
            return Object.keys(colTypes).filter(function(e) { return filter.indexOf(colTypes[e]) != -1  })
        }
    };

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
        setupPlotBasics(setupTab);
        setupPlotFacets(facetsTab);
        setupPlotOptions(optionsTab);
        setupPlotFilters(filtersTab);
        jQuery(setupTab + 'Tab a').tab('show'); // show setup tab
    }


    /**
     * called on each plot type change, shows the proper x,y,z,
     * select options that will define the plots axes
     *
     * @param {str} tabID - ID for tab into which to add DOM
     *   elements (e.g. '#setupTab')
     *
     */
    function setupPlotBasics(tabID) {

        var availableAxes = getAvailableAxes();

        ['x','y','z'].forEach(function(d) {
            if (availableAxes.indexOf(d) !== -1) {
                var axisSetup = getAxisSetup(d);
                var cols = getCols(axisSetup.type);
                var label = "label" in axisSetup ? axisSetup.label : d.toUpperCase()+"-axis";
                var domClass = d == 'z' ? 'col-sm-4 col-sm-offset-4' : 'col-sm-4';
                var addOption = d == 'z' ? {'None':null} : false;
                generateFormSelect(tabID, {values:cols, accessor:d +"-axis", label:label, domClass:domClass, addOption:addOption});
            }
        });
    }

    /**
     * called on each plot type change, shows the proper inputs
     * for the requested plot type based on the defined plot
     * options and whether allowFacets = true, if false
     * the row will be hidden
     *
     * @param {str} tabID - ID for tab into which to add DOM
     *   elements (e.g. '#setupTab')
     *
     */
    function setupPlotFacets(tabID) {

        if (getAllowFacets()) {

            // add tab and container
            addTab(tabID, 'Facets');

            // add instructions
            var note = 'Facets form a matrix of panels defined by row and column facetting variables; it is used to draw plots';
            note += ' with multiple axes where each axes shows the same relationship conditioned on different levels of some variable.';
            d3.select(tabID).append('div')
                .attr('class','form-group col-sm-12')
                .style('margin-bottom',0)
                .append('p')
                .html(note);

            ['horizontal','vertical'].forEach(function(d) {
                var cols = getCols('ordinal');
                var select = generateFormSelect(tabID, {values:cols, accessor:d+'-facet', label:(d == 'horizontal') ? 'Columns' : 'Rows', addOption:{'None':''}});
                select.on('change',function() { showButton('#facetsBtn') }); // activate reset button
            });

            var input = generateFormTextInput(tabID, {accessor:'colWrap', label:'Column wrap', type:'number'});
            input.on('change',function() { showButton('#facetsBtn') }); // activate reset button

            // filter reset button
            // initially hide it
            d3.select(tabID)
                .append('div')
                .attr('class','form-group col-sm-2 col-sm-offset-10')
                .style('margin-bottom',0)
                .append('button')
                .attr('id','facetsBtn')
                .attr('class','btn btn-warning btn-xs pull-right')
                .attr('disabled','disabled')
                .style('display','none')
                .on('click', resetFacets)
                .text('Reset filters');
        } else {
            d3.select(tabID).style('display','hidden');
        }
    }

    /**
     * called on each plot type change, shows the proper inputs
     * for the requested plot type based on the defined plot
     * options.
     *
     * @param {str} tabID - ID for tab into which to add DOM
     *   elements (e.g. '#setupTab')
     *
     */
    function setupPlotOptions(tabID) {
        var plotOptions = getPlotOptions();
        if (plotOptions) {

            // add tab and container
            addTab(tabID, 'Options');

            // add instructions
            var note = 'Use the inputs below to adjust options of the plot.';
            d3.select(tabID).append('div')
                .attr('class','form-group col-sm-10')
                .style('margin-bottom',0)
                .append('p')
                .html(note)

            plotOptions.forEach(function(d) {

                if (d.type == 'select') {
                    generateFormSelect(tabID, d);
                } else if (d.type == 'toggle') {
                    generateFormToggle(tabID, d); // TODO width of toggle not being calculated - it's due to the tab-pane class I think.
                } else if (d.type == 'slider') {
                    generateFormSlider(tabID, d);
                } else if (d.type == 'text' || d.type == 'number') {
                    generateFormTextInput(tabID, d)
                }

            })


        } else {
            d3.select(tabID).style('display','hidden');
        }

        addClearFix(tabID);
    }

    /**
     * Add clearfix so that columns wrap properly
     *
     * @param {str} - tab ID selector name
     *
     * @return void
     */
    function addClearFix(selector) {

        jQuery(selector + 'Tab a').tab('show'); // tab must be visible for jquery to calculate positions

        var cols = jQuery(selector + ' div.form-group');
        var colCount = 0;

        cols.each(function(i, col) {
            colCount += getBootstrapColWidth(this);
            
            if (colCount > 12) { // if column count is more than max bootstrap width of 12
                colCount -= 12;
                jQuery(this).before('<div class="clearfix"></div>'); // insert clearfix before current dom element
            }
        });
    }

    /**
     * Given a DOM element, function will return
     * the bootstrap column width if the element
     * has a bootstrap column class. For example,
     * the element with class .col-sm-4 would
     * return the interger 4.
     * 
     * @param {obj} - DOM element (e.g. this)
     *
     * @return {int} - column width, as a number
     *   between 1 and 12 (inclusive); if DOM
     *   element was not a bootstrap column, 0
     *   is returned
     */
    function getBootstrapColWidth(el) {
        var allClass = jQuery(el).attr('class');
        var colClass = allClass.split(' ').filter(function(d) { return d.includes('col-'); }); // array of classes that contain string col-

        for (var i = 0; i < colClass.length; i++) {
            var d = colClass[i];
            var last = parseInt(d[d.length - 1]);
            if (isInt(last)) return last;
        };

        return 0;
    }


    /**
     * Will create the appropriate input element used to 
     * filter the loaded data - the global 'unique' is
     * required in order to properly set the limits for
     * each of the filters.
     *
     * @param {str} tabID - ID for tab into which to add DOM
     *   elements (e.g. '#setupTab')
     *
     */
    function setupPlotFilters(tabID) {

        var slider, select;

        // it is required in order to set all the filter limits
        if (typeof unique !== 'undefined') {

            // add tab and container
            addTab(tabID, 'Filters');

            // add instructions
            var note = 'Use the inputs below to filter the plotted data.';
            note += '<br><span class="label label-default">NOTE</span> ';
            note += 'each additional filter is combined as an <code>and</code> boolean operation.';
            d3.select(tabID).append('div')
                .attr('class','form-group col-sm-10')
                .style('margin-bottom',0)
                .append('p')
                .html(note)

            // filter reset button
            // initially hide it
            d3.select(tabID)
                .append('div')
                .attr('class','form-group col-sm-2')
                .style('margin-bottom',0)
                .append('button')
                .attr('id','resetBtn')
                .attr('class','btn btn-warning btn-xs pull-right')
                .attr('disabled','disabled')
                .style('display','none')
                .on('click', resetFilters)
                .text('Reset filters');


            // generate an input for each of the columns in the loaded dataset
            for (var col in colTypes) {
                var colType = colTypes[col]
                var colVals = unique[col];

                console.log(col, colType)

                if (colType == 'int' || colType == 'float') { // if a number, render a slider
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
                        format = colTypes[col].format ? colTypes[col].format : function(d) { return '[' + parseInt(d[0]) + ',' + parseInt(d[1]) + ']' };
                    } else if (colType == 'float') {
                        format = colTypes[col].format ? colTypes[col].format : function(d) { return '[' + parseFloat(d[0]).toFixed(2) + ',' + parseFloat(d[1]).toFixed(2) + ']'; };
                    }
                    var opts =  {accessor:col+'Filter', label:col, domClass:'col-sm-4 filterInput', options:sliderOptions, format:format}
                    slider = generateFormSlider(tabID, opts);
                    slider.noUiSlider.on('start',function() { showButton('#resetBtn') }); // activate reset button

                } else if (colType == 'str') { // if categorical, render a select
                    var opts = {values:colVals, accessor:col+'Filter', label:col, domClass:'col-sm-4 filterInput', addOption:'All', multiple:true};
                    select = generateFormSelect(tabID, opts); // TODO this will potentially generate a select with a ton of options ...
                    select.on('input',function() { showButton('#restBtn') }); // activate reset button
                } else if (colType == 'datetime') {
                    var opts = {od:col+'DateTime', label:col, type:colType, range:true};
                    generateDateTimeInput(tabID, opts);
                }
            }
   
        }

        addClearFix(tabID);
    }

    /**
     * remove read-only from reset button and show it
     */
    function showButton(id) {
        jQuery(id).attr('disabled',false).show();
    }

  
    /**
     * on click even handler to reset all the facet
     * inputs as well as hide the rest button
     */ 
    function resetFacets() {

        // reset all select to first option
        jQuery(facetsTab + ' select').prop("selectedIndex", 0);

        // reset button to read only and hide
        d3.select('#facetsBtn')
            .attr('disabled','disabled')
            .style('display','none');
        return false;
    } 


    /**
     * on click event handler to reset all filters to 'default'
     * values - in this case default means the first option
     * for a select, and min/max values for sliders.
     */
    function resetFilters() {

        // reset sliders
        for (var col in colTypes) {
            var colType = colTypes[col];
            if (colType == 'int' || colType == 'float') {
                var slider = d3.select('#'+col+'FilterSliderWrap').node()
                var colVals = d3.extent(unique[col]);
                slider.noUiSlider.set(colVals); // TODO use this.options.start instead
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
     */
    function buildSkeleton(selector) {

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
            .on('click', renderPlot);

    }


    /**
     * When a user uploads a file, this function will
     * inpsect the parsed data and determine the data
     * type for each column as 'int','float','str' or
     * 'datetime'
     *
     * @param {array} parsedDat - parsed data from PapaParse
     *   library; each array element is an object with column
     *   names as keys, and cell value as value
     * @param {array, optional} ignreCol - list of column names to ignore
     *   from output object; this is how a user can ignore columns
     *   present in their data.
     * @param colTypes {obj, optional} - same format as the output of this
     *   function; allows user to manually overwrite a column type. e.g.
     *   if all subjects are identified with a numeric ID, but user still
     *   wants to treat this as a str.
     *
     * @return {obj} - each key is a column name, each value
     *   is the column data type (int,float,str,datetime)
     */
    function findColumnTypes(parsedDat, ignoreCol, colTypes) {
        var colMap = {};

        // add colTypes keys (column names) to the ignore list
        // we will manually add them in before the return
        if (colTypes) ignoreCol.concat(Object.keys(colTypes));

        // init with first row vals
        var colNames = Object.keys(parsedDat[0]); // column names
        var colVals = Object.values(parsedDat[0]); // row 1 values
        colNames.forEach(function(d,i) {
            if (ignoreCol.indexOf(d) == -1) colMap[d] = getDatType(colVals[i]);
        })

    
        // check each row for the data type
        // we only update things if the data
        // type 'trumps' the first row
        // 'trump' order is int, float, datetime,
        // str meaning a float type will convert trump
        // an int
        var trump = {'int':0, 'float':1, 'datetime': 2, 'str':3}
        parsedDat.forEach(function(d) {
            var rowVal = Object.values(d);

            colNames.forEach(function(col,i) {
                if (ignoreCol.indexOf(col) == -1 ) {
                    var currentType = colMap[col];
                    if (currentType === 'str') return;
                    var valType = getDatType(rowVal[i]);
                    if (valType !== currentType) { // if type is different than currently stored
                        if (valType == 'datetime' || valType == 'str') {
                            // if previously a number (int or float) and changing to either datetime or str, make it a str
                            colMap[col] = 'str';
                        } else if (trump[valType] > trump[currentType]) { 
                            colMap[col] = valType;
                        } else if (trump[valType] < trump[currentType] && currentType == 'datetime') { 
                            // if previously a datetime, and we get anything else, convert to str
                            colMap[col] = 'str';
                        }
                    }
                }
            });
        });

        // manually add in user specified column type
        if (colTypes) {
            Object.keys(colTypes).forEach(function(d,i) {
                colMap[d] = Object.values(colTypes)[i];
            })
        }

        return colMap;
    }

    /**
     * Given a variable, return type of datum,
     * one of either int, float, str, or datetime.
     */
    function getDatType(mixedVar) {
        if (!isInt(mixedVar) && !isFloat(mixedVar) && isDateTime(mixedVar)) return 'datetime';
        if (!isInt(mixedVar) && !isFloat(mixedVar) && !isDateTime(mixedVar) && isStr(mixedVar)) return 'str';
        if (isInt(mixedVar) && !isFloat(mixedVar) && !isStr(mixedVar)) return 'int';
        if (!isInt(mixedVar) && isFloat(mixedVar) && !isStr(mixedVar)) return 'float';
    }

    // return true if val is an interger
    function isInt(val) {
        return val === +val && isFinite(val) && !(val % 1); // http://locutus.io/php/var/is_int/
    }
    // return true if val is a float
    function isFloat(val) {
        return +val === val && (!isFinite(val) || !!(val % 1)); // http://locutus.io/php/var/is_float/
    }
    // return true if val is a str
    function isStr(val) {
        return isNaN(val)
    }
    // return true if val is a datetime str
    function isDateTime(val) {
        return !isNaN(Date.parse(val))
    }



    /**
     * onClick event handler for uploading data, called
     * when users selects a file to upload from the
     * upload modal. Function will parse the user provided
     * file and setup the proper globals 'dat' & 'unique'
     */
    function uploadData() {

        // parse file
        $('input[type=file]').parse({
            config: {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: function(results, file) {
                    data = results.data;
                    var meta = results.meta;
                    var errors = results.errors;

                    // clear modal body
                    var modalBody = d3.select('#modalBody')
                    modalBody.html('');
                    jQuery('#uploadDone').remove();

                    if (errors.length) { // if there was an error
                      
                        jQuery('.modal-content').addClass('panel-danger');

 
                        // just grab first error for now
                        var errorText = '<span class="text-danger fa fa-exclamation " aria-hidden="true"></span> ' + errors[0].message;
                        if (typeof errors[0].row !== 'undefined') errorText += " - error found in row " + errors[0].row;
                        modalBody.append('h4')
                            .attr('class','lead')
                            .html(errorText)
                    } else {

                        jQuery('.modal-content').removeClass('panel-danger').addClass('panel-info');
                        var colTypes = findColumnTypes(data, ignoreCol);
                        unique = getAllUnique(data, colTypes)

                        // show user parsed results
                        modalBody.append('h4')
                            .attr('class','lead')
                            .text('Data loaded successfully!')
                        modalBody.append('p')
                            .text('The following columns were found with the given column types:')

                        modalBody.append('ul')
                            .selectAll('li')
                            .data(Object.keys(colTypes))
                            .enter()
                            .append('li')
                            .html(function(d, i) { return d + ' - <code>' + Object.values(colTypes)[i] + '</code>'; });

                        modalBody.append('p')
                            .text('If this is incorrect, please change your data and upload again.');

                        // add 'done' button
                        d3.select('.modal-footer')
                            .append('button')
                            .attr('type','button')
                            .attr('class','btn btn-success')
                            .attr('data-dismiss','modal')
                            .attr('id','uploadDone')
                            .text('Done')
                            .on('click', loadGUI);

                    }
                }
            },
            before: function(file, inputElem) {
                // show spinner
                var modalBody = d3.select('#modalBody')
                modalBody.html(''); // clear content

                // ensure proper file type
                var allowFileType = ['csv','txt','tsv'];
                var tmp = file.name.split('.');
                var extension = tmp[tmp.length - 1];
                if (allowFileType.indexOf(extension) == -1 || ["text/plain","text/csv"].indexOf(file.type) == -1) {

                    jQuery('.modal-content').addClass('panel-danger');

                    var errorText = '<span class="text-danger fa fa-exclamation " aria-hidden="true"></span> ';
                    errorText += 'File must be plain text have one of the following extensions: ' + allowFileType.join(", ");
                    modalBody.append('h4')
                        .attr('class','lead')
                        .html(errorText)

                    return {action: "abort"};

                } else { // no errors loading file, proceed

                    modalBody.append('i')
                        .attr('class','fa fa-spinner fa-pulse fa-2x fa-fw');
                    modalBody.append('span')
                        .text('Loading...');

                    return {action: "continue"};
                }
            },
        });
        
    }

    /**
     * Helper function called after user properly
     * loads data - used to intialize GUI
     */
    function loadGUI() {
        var moo = new gui();
        moo.options = guiSetup;
        moo.container = "#guiWrap";
        moo.canvas = '#canvas';
        moo.data = data;
        moo.init();
    }


    /**
     * Automatically called if data isn't yet loaded
     */
    function showModal() {

        // if modal doesn't already exist, create it
        if (jQuery('#uploadModal').length === 0) {
        
            var modal = d3.select('body').append('div')
                .attr('class','modal fade')
                .attr('tabindex',-1)
                .attr('role','dialog')
                .attr('id','uploadModal')
                .append('div')
                .attr('class','modal-dialog')
                .attr('role','document')
                .append('div')
                .attr('class','modal-content panel-info')

            var modalHeader = modal.append('div')
                .attr('class','modal-header panel-heading')
                
            modalHeader.append('button')
                .attr('type','button')
                .attr('class','close')
                .attr('data-dismiss','modal')
                .attr('aria-label','Close')
                .append('span')
                .attr('area-hidden',true)
                .html('&times')

            modalHeader.append('h4')
                .attr('class','modal-title')
                .text('Load data')

            var modalBody = modal.append('div')
                .attr('class','modal-body')
                
            var text = "Looks like you don't have any data loaded, please upload some.";
            modalBody.append('div')
                .attr('class','row')
                .append('div')
                .attr('class','col-sm-12')
                .attr('id','modalBody')
                .append('h4')
                .attr('class','lead')
                .text(text)

            var modalFooter = modal.append('div')
                .attr('class','modal-footer')


            modalFooter.append('label')
                .attr('class','btn btn-primary btn-file')
                .text('Upload')
                .append('input')
                .attr('type','file')
                .style('display','none')
                .on('change',uploadData)

            jQuery('#uploadModal').modal().show();
        }
            
    }



    /**
     * Ensure all data are set before doing anything
     *
     * Returns true if all data ready; false otherwise
     */
    function checkIfReady() {

        if (!container) {
            displayWarning("You must first set the <code>container</code> attribute before building the GUI", false, true)
            return false;
        }
        if (!options) {
            displayWarning("You must first set the <code>options</code> attribute before building the GUI", false, true)
            return false;
        }
        if (!canvas) {
            displayWarning("You must first set the <code>canvas</code> attribute before building the GUI", false, true)
            return false;
        }
        if (!data) {
            showModal(); 
            return false;
        }

        return true;
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
     * @param {obj} opts - options for select, can contain the following keys:
     * @key {string} accessor - id/name to give to toggle
     * @key {string} label - label text
     * @key {str} domClass - (optional, default=col-sm-4) class to assign to 
     *   div containing input, should be a boostrap column class type (e.g. col-sm-3)
     * @key {obj} options - toggle options, see http://www.bootstraptoggle.com/ API
     * @key {funct} format - function to format slider value; defaults to "[val]"
     *
     * @return slider (node) on which one can attach events
     */
    function generateFormSlider(selector, opts) {

        if (typeof opts.domClass === 'undefined' || !opts.domClass) opts.domClass = 'col-sm-4';
        if (typeof opts.format === 'undefined') opts.format = function(d) { return '[' + d + ']'; };
        if (typeof opts.options === 'undefined' || !opts.options) {
            options = { // default slider if no options provided
                start:[50],
                step: 1,
                range: {
                    min: 0,
                    max: 100
                }
            };
        }
        var id = opts.accessor
        opts.label = typeof opts.label === 'undefined' ? id : opts.label; // in case label not set in options, use the id
        var format = opts.format;
        var formGroup = inputHeader(selector, opts);
        var minValueReplace = opts.minValueReplace;
        var maxValueReplace = opts.maxValueReplace;

        formGroup.append('span')
            .attr('class','muted')
            .attr('id',id+'Val')
            .text(opts.format(opts.options.start));

        var slider = formGroup.append('div')
            .attr('id',id+'SliderWrap')
            .node()

        // generate slider
        noUiSlider.create(slider, opts.options);
        var tabName = selector.replace('#','');
        if (!(tabName in sliderValues)) sliderValues[tabName] = {};

        // initialize slider value store
        var initValue = opts.options.start;
        if (initValue.length == 2) {
            if (typeof minValueReplace !== 'undefined' && initValue[0] == opts.options.range.min) initValue[0] = minValueReplace;
            if (typeof maxValueReplace !== 'undefined' && initValue[1] == opts.options.range.max) initValue[1] = maxValueReplace;
        } else {
            if (typeof minValueReplace !== 'undefined' && initValue == opts.options.range.min) initValue = minValueReplace;
            if (typeof maxValueReplace !== 'undefined' && initValue == opts.options.range.max) initValue = maxValueReplace;
        }
        sliderValues[tabName][id] = initValue;

        // add event listener for slider change
        slider.noUiSlider.on('slide', function(d) {
            var sliderVal = this.get();
            var sliderMin = this.options.range.min;
            var sliderMax = this.options.range.max;
            jQuery('#' + id + 'Val').text(format(sliderVal)); // update displayed value
            var tabName = jQuery('#' + id + 'Val').closest('.tab-pane').attr('id');

            // store slider values into gui global
            // replace the value with min/max ValueReplace if present
            var sliderValue;
            sliderValues[tabName][id] = d.map(function(e, i) { 
                if (i == 0) {
                    if (typeof minValueReplace !== 'undefined' && sliderVal == sliderMin) {
                        sliderValue = minValueReplace;
                    } else {
                        sliderValue = convertToNumber(e);
                    }
                } else if (i == 1) { // if two handled slider, this is the right one
                    if (typeof maxValueReplace !== 'undefined' && sliderVal == sliderMax) {
                        sliderValue = maxValueReplace;
                    } else {
                        sliderValue = convertToNumber(e);
                    }
                }
                return sliderValue;
            });

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
    function inputHeader(selector, opts) {
        var formGroup = d3.select(selector).append('div')
            .attr('class', 'form-group ' + opts.domClass)
            
        var span = formGroup.append('span')
            .attr('id',opts.accessor + 'Wrap')
        
        span.append('label')
            .attr('for',opts.accessor)
            .html(opts.label)

        // add popover
        if (typeof opts.help !== 'undefined') {

            if (!('container' in opts.help)) opts.help.container = 'div#guiWrap'; // constrain popover to GUI if not specified

            span.attr('data-toggle','popover')
                .append('i')
                .attr('class','fa fa-info-circle text-primary')
                .attr('aria-hidden',true)
                .style('margin-left','5px')
            jQuery('#' + opts.accessor + 'Wrap').popover(opts.help);
        }

        return formGroup;
    }

    /**
     * Generate a bootstrap toggle input
     *
     * @param {string} selector - element to which to add form-group (label and select)
     * @param {obj} opts - options for select, can contain the following keys:
     * @key {string} id - id/name to give to toggle
     * @key {string} label - label text
     * @key {str} domClass - (optional, default=col-sm-4) class to assign to 
     *   div containing input, should be a boostrap column class type (e.g. col-sm-3)
     * @key {obj} options - toggle options, see http://www.bootstraptoggle.com/ API
     */
    function generateFormToggle(selector, opts) {

        if (typeof opts.domClass === 'undefined' || !opts.domClass) opts.domClass = 'col-sm-2';
        var id = opts.accessor
        opts.label = typeof opts.label === 'undefined' ? id : opts.label; // in case label not set in options, use the id
        var formGroup = inputHeader(selector, opts);
            
        formGroup.append('br')

        var toggle = formGroup.append('input')
            .attr('type','checkbox')
            .attr('data-toggle','toggle')
            .attr('id',id)
            .attr('name',id);

        jQuery('input#'+id).bootstrapToggle(opts.options); //activate
        if (opts.set) jQuery('input#'+id).bootstrapToggle('on'); // set default on 

    }


    /**
     * Generate a text input
     *
     * @param {string} selector - element to which to add form-group (label and select)
     * @param {obj} opts - options for select, can contain the following keys:
     * @key {string} accessor - id/name to give to input
     * @key {string} label - label text
     * @key {str} domClass - (optional, default=col-sm-4) class to assign to 
     *   div containing input, should be a boostrap column class type (e.g. col-sm-3)
     * @key {str} type - type of input, 'text' or 'number'
     */
    function generateFormTextInput(selector, opts) {

        if (opts.type != 'number' && opts.type != 'text') return;

        if (typeof opts.required === 'undefined' || opts.required === null) opts.required = false;
        if (typeof opts.domClass === 'undefined' || opts.domClass == false) opts.domClass = 'col-sm-4';
        var id = opts.accessor
        opts.label = typeof opts.label === 'undefined' ? id : opts.label; // in case label not set in options, use the id
        

        var formGroup = inputHeader(selector, opts);

        var input = formGroup.append('input')
            .attr('class','form-control')
            .attr('id',id)
            .attr('name',id)
            .attr('required',opts.required)
            .attr('type',opts.type);
   
        if (typeof opts.set !== 'undefined') input.attr('value',opts.set); 

        return input;
    }


    /**
     * Generate a datetime input picker
     * https://github.com/Eonasdan/bootstrap-datetimepicker
     *
     * TODO
     */
    function generateDateTimeInput(selector, opts) {
        if (typeof opts.addOption === 'undefined') opts.addOption = false;
        if (typeof opts.domClass === 'undefined' || opts.domClass == false) opts.domClass = 'col-sm-4';
        var id = opts.accessor
        opts.label = typeof opts.label === 'undefined' ? id : opts.label; // in case label not set in options, use the id

        var formGroup = inputHeader(selector, opts); // TODO in case of opts.range we need to show pickers next to one another (right now they are on top of one another)

        var pickerDT = buildDateTimePicker(formGroup, id);

        jQuery('#'+id+'DateTime').datetimepicker({
            format: opts.type == 'datetime' ? "YYY-MM-DD h:mm:ss a" : "YYYY-MM-DD", // TODO allow for datetime or date picker
            showTodayButton: true,
        }); // activate

        // if date range required, add second picker
        if (opts.range === true) {
            var pickerDT2 = buildDateTimePicker(formGroup, id+'2');

            var picker1 = '#'+id+'DateTime';
            var picker2 = '#'+id+'2DateTime';

            $(picker2).datetimepicker({
                useCurrent: false //Important! See issue #1075
            });
            $(picker1).on("dp.change", function (e) {
                $(picker2).data("DateTimePicker").minDate(e.date);
            });
            $(picker2).on("dp.change", function (e) {
                $(picker1).data("DateTimePicker").maxDate(e.date);
            });
        }

        return pickerDT;
    }

    /*
     * generate DOM elements for datetime picker
     *
     * @param {dom} formGroup - return of inputHeader();
     * @param {str} id - ID to give to input, final ID
     *  will be id +'DateTime'
     *
     * @return picker DOM
     */
    function buildDateTimePicker(formGroup, id) {

        var picker = formGroup.append('div')
            .attr('class','input-group date')
            .attr('id',id+'DateTime');

        picker.append('input')
            .attr('type','text')
            .attr('class','form-control')
            .attr('id',id)
            .attr('name',id);
        
        picker.append('span')
            .attr('class','input-group-addon')
            .append('i')
            .attr('class','fa fa-calendar')
            .attr('aria-hidden',true);
        
        return picker
    }


    /**
     * Generate a select used in a form along with the label. Note that DOM generated
     * by this function will be assigned a col-sm-4 class.
     *
     * The 'value' setting for each item in the select will be set to the SQL column
     * type e.g. str, float, datetime, int
     *
     * @param {string} selector - element to which to add form-group (label and select)
     * @param {obj} opts - options for select, can contain the following keys:
     * @key {array/obj}  values - list of options to populate select with. If an
     *   array is passed, both the select value and text will be the set with the
     *   array elements; if an object is passed keys will be the option label and
     *   obj values will be the option value.
     * @key {string} accessor - id/name to give to select
     * @key {string} label - label text
     * @key {str} domClass - (optional, default=col-sm-4) class to assign to 
     *   div containing input, should be a boostrap column class type (e.g. col-sm-3)
     * @key {str/obj} addOption - (optional, default=False) whether to prepend an additional option
     *  in the select list, allows for things like 'All' or 'None' - note this will be the first option
     * @key {bool} multiple - (optional, default=False) whether to allow multiple selections
     *
     * @return select DOM
     *
     */
    function generateFormSelect(selector, opts) {

        if (typeof opts.addOption === 'undefined') opts.addOption = false;
        if (typeof opts.domClass === 'undefined' || opts.domClass == false) opts.domClass = 'col-sm-4';
        var id = opts.accessor
        opts.label = typeof opts.label === 'undefined' ? id : opts.label; // in case label not set in options, use the id

        var formGroup = inputHeader(selector, opts);

        var numOptions = Array.isArray(opts.values) ? opts.values.length : Object.keys(opts.values).length;

        var select = formGroup.append('select')
            .attr('class','form-control selectpicker')
            .attr('id',id)
            .attr('name',id)

        if (opts.multiple) select.attr('multiple','')

        // if many options present, limit viewable to 10
        // and add the searchbox
        if (numOptions >= 10) {
            select.attr('data-live-search',numOptions >= 10)
                .attr('data-size',10);
        }

        select.selectAll('option')
            .data(Array.isArray(opts.values) ? opts.values : Object.values(opts.values)).enter()
            .append('option')
            .text(function (d,i) { return Array.isArray(opts.values) ? d : Object.keys(opts.values)[i]; })
            .attr('value', function (d) { return d; });

        // prepend option to select
        if (opts.addOption) {
            var value = '';
            var text = '';
            if (typeof opts.addOption !== 'object') {
                value = opts.addOption;
                text = value;
            } else {
                value = Object.values(opts.addOption)[0];
                text = Object.keys(opts.addOption)[0];
            }
            jQuery('#' + id).prepend('<option value="' + value + '">' + text + '</option>').val(jQuery("#" + id + " option:first").val());
        }

        // selects get set to hidden automatically because tab is
        // hidden (I think...), so manually show them here to ensure
        // they are visible.
        jQuery('#'+id).selectpicker('show');

        return select;

    }

    /**
     * Append a tab to the GUI, assume ul .nav already exists
     *
     * @param {str} id - ID to give to tab-content tab, this
     *  will also set the .nav li element with an id of
     *  id + 'Tab'
     * @param {str} text - label text for tab
     * @param {bool} active - whether to give the tabpanel 
     *  the 'active' class
     */
    function addTab(id, text, active) {

        id = id.replace('#','');

        var a = d3.select('.nav').append('li')
            .attr('role','presentation')
            .attr('class', function() { return active ? 'active' : null})
            .attr('id', id + 'Tab')
            .append('a')
            .attr('role','tab')
            .attr('data-toggle','tab')
            .attr('href','#'+id)
            .text(text)

        d3.select('.tab-content').append('div')
            .attr('role','tabpanel')
            .attr('class', function () { return active ? 'tab-pane row active' : 'tab-pane row'})
            .attr('id',id)
    }

 
    /**
     * Parse GUI options and generate the remaining
     * tabs and content by calling plotTypeChange();
     */
    function populateGUI(options) {

        addTab(setupTab, 'Setup', true);

        // add instructions
        var note = 'Choose the type of plot to be rendered along with the proper data for each axis.';
        d3.select(setupTab).append('div')
            .attr('class','form-group col-sm-12')
            .style('margin-bottom',0)
            .append('p')
            .html(note);

        var select = generateFormSelect(setupTab, {values:plotTypes(), accessor:plotTypesID.replace('#',''), label:"Plot type"})
        select.on('change', plotTypeChange);


        plotTypeChange(); // fire to select first plot type
    }






    function getFacetRow(d) { return d.plotFacets['horizontal-facet'].value; }
    function getFacetCol(d) { return d.plotFacets['vertical-facet'].value; }
    function getFacetWrap(d) { return d.plotFacets.colWrap.value; }
    function dataFilterOn() { return jQuery('#resetBtn').is(':visible'); }

    /**
     * If user specifies to filter data
     * TODO
     */
    function filterData(dat) {
        console.log('TODO: filter data');

        return dat;
    }

    /**
     * on click event handler for 'Render' button. will check all the user set
     * GUI values and ensure plots can be rendered. will also remove any current
     * plots if needed (only when facet options are changed). finally, will also
     * setup all the proper facets if needed and then render the plot in the facet.
     *
     * expects the following variables to have been set on the main plotting page:
     * @param data
     * @param canvas
     * @param unique
     *
     * @return void
    */
    function renderPlot() {

        // get GUI vals
        var guiVals = getGUIvals('form');

        // clear any previously existent plots/warnings
        // plots are only cleared if the GUI options for facets are changed
        if (guiFacetCols !== getFacetRow(guiVals) || guiFacetRows !== getFacetCol(guiVals) || guiFacetWrap !== getFacetWrap(guiVals)) jQuery(canvas).empty();
        jQuery('#warning').empty();

        // before rendering anything, let's ensure the selected GUI options make sense to render
        if (guiWarnings(guiVals)) return;
        
        // everything looks good, let's render!
        // change render button to spinner
        jQuery('#renderBtn').html('<i class="fa fa-spinner fa-spin"></i>').prop('disabled', true);
        jQuery('.collapse').collapse() // collapse GUI

        // filter data if needed
        if (dataFilterOn()) data = filterData(data);

        // generate facets and group data
        var facets = setupFacetGrid(canvas, guiVals, data, unique);
        var facetRows = Object.keys(facets);
        var facetCols = Object.keys(facets[facetRows[0]]);

        var facetVals = guiVals.plotFacets;
        var hVal = facetVals['horizontal-facet'].value
        var vVal = facetVals['vertical-facet'].value
        var hLabel = facetVals['horizontal-facet'].label
        var vLabel = facetVals['vertical-facet'].label

        // store current GUI facet options so we can compare for updates
        guiFacetCols = getFacetRow(guiVals);
        guiFacetRows = getFacetCol(guiVals);
        guiFacetWrap = getFacetWrap(guiVals);

        // draw plot in each facet
        var chartCount = 0;
        facetRows.forEach(function(rowName,i) {
            facetCols.forEach(function(colName,j) {

                var selFacet = '#row_' + i + '-col_' + j;
                var facetDat = facets[rowName][colName];

                if (typeof facetDat !== 'undefined') {

                    var title = null;
                    if (facetVals.facetOn) {
                        if (hVal && vVal) {
                            title = vVal + ' = ' + rowName + ' | ' + hVal + ' = ' + colName;
                        } else if (hVal || vVal) {
                            title = vVal ? vLabel + ' = ' + rowName : hLabel + ' = ' + colName;    
                        }
                    }

                    // draw plot
                    populateChart(facetDat, selFacet, guiVals, title, chartCount);
                }
                chartCount += 1;
            });

            // update list of columns for new row
            if (facetRows.length > 1 && (i+1) < facetRows.length) facetCols = Object.keys(facets[facetRows[i+1]]);
        })

        
        jQuery('#renderBtn').html('Update').prop('disabled', false); // TODO wait until everything finishes rendering ... async!
    }






    /**
     * Generate the proper facet grid setup based on GUI options
     * and group data.
     *
     * Will generate the proper number of rows as well as columns
     * within those rows; each of these facets will house a plot.
     *
     * Each row is setup as a boostrap row with an additional
     * 'facetRow' class; each column has a 'facet' class.
     *
     * @param {string} sel - selector for DOM to house grid
     * @param {obj} guiVals - return from getGUIvals()
     * @param {obj} dat - return from convertToJSON()
     * @param {obj} unique - return from getAllUnique()
     *
     * @return obj: grouped data {row: col: {dat}}
     *
     * Depending on the input data, all groupings may not exist; it should
     * not be assumed that all groupings will have data for it. Furthermore,
     * even if only row or col is specified, the return format is always
     * {row: col: {dat}} - for example, if no row specified dat will return with
     * key 'row0'.
     *
     */
    function setupFacetGrid(sel, guiVals, dat, unique) {

        var facetRow, facetCol, colDat, colWrap, plotDom;
        var rowDat = ['row0'];
        var colDat = ['col0'];
        var numRows = rowDat.length;
        var numCols = colDat.length;
        var aspectRatio = 2.0; // width to height ratio
        var plotDom = d3.select(sel);
        var facetVals = guiVals.plotFacets;

        if (facetVals.facetOn) {  // if plotting with facets
            var hVal = facetVals['horizontal-facet'].value
            var vVal = facetVals['vertical-facet'].value
            if (vVal) { // if row facet specified
                facetRow = facetVals['vertical-facet'].label;
                rowDat = unique[facetRow];
            }
            if (hVal) { // if col facet specified
                facetCol = facetVals['horizontal-facet'].label
                colDat = unique[facetCol];
            }
            colWrap = (facetVals.colWrap) ? facetVals.colWrap.value : false;

            numRows = (colWrap) ? Math.ceil(colDat.length / colWrap) : rowDat.length;
            numCols = (colWrap) ? colWrap : colDat.length;
        }


        // calculate width/height of each facet 
        var colWidth = jQuery('#guiWrap').width() / numCols;
        var rowHeight = colWidth / aspectRatio;

        // generate DOM elements
        for (var i = 0; i < numRows; i++) {

            var row = plotDom.append('div')
                .attr('class', 'facetRow')
                .attr('id', 'row_' + i);

            for (var j = 0; j < numCols; j++) {
                row.append('div')
                    .attr('class', 'facet')
                    .attr('id','row_' + i + '-col_' + j)
                    .style({height: rowHeight + 'px', width: colWidth + 'px'})
            }

            // this will prevent the final row from filling with facets
            if (colWrap && i == (numRows - 2) ) numCols = (colDat.length % colWrap) ? colDat.length % colWrap : colWrap; 

        }


        // group the data
        // first group by row, then by column
        // into form {row_groups: {col_groups: {dat} } }
        // if row & col combination of data is missing, undefined will be the val
        if (facetRow && facetCol) {
            var nested = d3.nest()
                .key(function(d) { return d[facetRow] })
                .key(function(d) { return d[facetCol] })
                .map(dat);

            // set undefined for missing data
            for (var i = 0; i < rowDat.length; i++) {
                if (!(rowDat[i] in nested)) nested[rowDat[i]] = {};
                for (var j = 0; j < colDat.length; j++) {
                    if (!(colDat[j] in nested[rowDat[i]])) nested[rowDat[i]][colDat[j]] = undefined;
                }
            }

        } else if (facetRow || facetCol) {
            var tmp = d3.nest()
                .key(function(d) { return (facetRow) ? d[facetRow] : d[facetCol] })
                .map(dat);

            var nested = {};
            if (facetRow) { // if grouping in rows
                for (var i = 0; i < rowDat.length; i++) {
                    var rowGroup = rowDat[i];
                    var groupDat = tmp[rowGroup];
                    nested[rowGroup] = {col0: groupDat};
                }        
            } else { // if grouping in cols
                if (colWrap) {
                    var i = 0;

                    for (var j = 0; j < colDat.length; j++) {
                        var rowI = 'row' + i;
                        if (!(rowI in nested)) {
                            nested[rowI] = {};
                        }
                        var colI = colDat[j];
                        nested[rowI][colI] = tmp[colI];

                        if ((j + 1) % colWrap == 0) i++;
                    }
                } else {
                    nested = {row0: tmp};
                }
            }
        } else {
            var nested = {row0: {col0: dat} };
        }

        return nested;

    }















    /**
     * Get all unique values for each of the columns provided by the datatable.
     *
     * Note that only data for those columns defined in colTypes will be returned
     *
     * @param {array} dat - Return of convertToJSON. An array of objects where the object key is the column header
     *                and the value is the column value.
     * @param {obj} colTypes - SQL column types for each field
     *
     * @ return {obj} Each key is a column and each value is an array of unique values that column has.
     */

    function getAllUnique(dat, colTypes) {

        var colNames = Object.keys(colTypes); // list of columns for datatable
        var vals = {};

        function sortNumber(a,b) {
            return a - b;
        }

        colNames.forEach(function(colName) {
            var colType = colTypes[colName]
            if (colType !== 'excluded') {
                var unique = [...new Set(dat.map(item => item[colName]))].sort(); // http://stackoverflow.com/a/35092559/1153897
                if (colType == 'int' || colType == 'float') unique = unique.sort(sortNumber); // sort numerically if needed
                vals[colName] = unique.map(function(d) { return d });
            }
        })

        return vals;

    }












    /**
     * Once all GUI options and data are set, we can
     * render the plot.
     *
     * @param {obj} dat - data for each facet
     * @param {string} sel - selector for facet into which to render plot
     * @param {obj} formVals - GUI option values
     * @param {string} title - [optional] title for plot, should be null if no title
     *
     * @return void
     */
    function populateChart(dat, sel, formVals, title, chartCount) {

        var plotType = formVals.plotSetup.plotTypes.value;
        var plotOptions = options.plotTypes[plotType]; // lookup options for selected plot type
        var datReady = dat;

        // nvd3 expects SVG to exist already
        d3.select(sel).append('svg');

        // parse data if needed before plotting
        var parseFunc = plotOptions.parseData;
        if (typeof parseFunc === "function") {
            datReady = parseFunc(dat);
        }


        // create the chart
        nv.addGraph(function() {
            console.log('Rendering ' + plotType);
            var chart;

            // load previous chart if it exists
            if (typeof chartArray[chartCount] !== 'undefined') {
                chart = chartArray[chartCount];
            } else {
                chart = nv.models[plotType]();
            }

            // setup data accessors for each axis
            // we will need the name of the accessor function to be called on the chart
            // as well as the actual accessor function (which is defined by the GUI)
            console.log('Setting options');
            ['x','y','z'].forEach(function(d) {
                var accessorName = plotOptions.setup[d].accessor;
                var accessorAttr = formVals.plotSetup[d+'-axis'].value; // get the GUI value for the given chart axis option
                if (accessorName) {
                    console.log(accessorName + ':' + accessorAttr);
                    var accessorFunc = function(d) { return d[accessorAttr] };
                    chart[accessorName](accessorFunc);
                }
            });

            // set chart options
            plotOptions.options.forEach(function(d) {
                var optionName = d.accessor;
                var optionValue = formVals.plotOptions[optionName]; // get the GUI value for the given chart options

                // if GUI option was an array (for a single handle slider) grab the only element
                if (Array.isArray(optionValue) && optionValue.length === 1) optionValue = optionValue[0];

                // if GUI option was a select input type, data comes in as an object, grab just the values
                if (typeof optionValue === 'object' && optionValue != null) optionValue = optionValue.value;

                // convert bool string into bool
                optionValue = optionValue === "true" ? true : optionValue === "false" ? false : optionValue;

                console.log(optionName + ':' + optionValue);
                chart[optionName](optionValue)
            })

            // set title
            if (title !== null && title) chart.title(title);

            //formatAxisTitle(chart, guiVals);
            //formatTooltip(chart, guiVals);

            d3.select(sel + ' svg')
                .datum(datReady)
                .call(chart);

            nv.utils.windowResize(chart.update);

            chartArray[chartCount] = chart;

            return chart;
        });

    }


    /*
     * Adjust default tooltip formatting
     *
     * @param {obj} chart - nvd3 chart object
     * @param {obj} guiVals - GUI option values
     *
     * @return void
     */
    function formatTooltip(chart, formVals) {
        chart.tooltip.headerFormatter(function (d) { return guiVals.axisX.label + ' ' + d })
    }




    /*
     * Add axis title and format tick labels based on
     * field type.
     *
     * @param {obj} chart - nvd3 chart object
     * @param {obj} guiVals - GUI option values
     *
     * @return void
     */

    function formatAxisTitle(chart, guiVals) {

        // format tick labels
        if (guiVals.axisX.value === 'float') {
            chart.xAxis.tickFormat(d3.format('.02f'));
        }
        if (guiVals.axisY.value === 'float') {
            chart.yAxis.tickFormat(d3.format('.02f'));
        }

        // set axis titles
        chart.showXAxis(true);
        chart.showYAxis(true);
        chart.xAxis.axisLabel(guiVals.axisX.label)
        chart.yAxis.axisLabel(guiVals.axisY.label)

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
    Object.defineProperty(this,"canvas",{
        get: function() { return canvas; }, set: function(_) { canvas = _; }
    });
    Object.defineProperty(this,"colTypes",{
        get: function() { return colTypes; }, set: function(_) { colTypes = _; }
    });
    Object.defineProperty(this,"data",{
        get: function() { return data; }, set: function(_) { data = _; }
    });
    Object.defineProperty(this,"ignoreCol",{ // array of column names to ignore in given data
        get: function() { return ignoreCol; }, set: function(_) { ignoreCol = _; }
    });



}




/**
 * Preload all globals and setup variables
 * so that the GUI can be drawn.
 *
 * @param {array of array} dat : input data where inner list is row of data
 * @param {obj} colTypes: object of SQL column types
 *
 *
 */

function preLoad(inputDat, colTypes) {

    if (typeof inputDat === 'undefined') {
        jQuery('body').append('<h2>You must declare a global name <code>dat</code>, organized as a list of lists where each inner list is a row of the datatable.</h2>');
        return;
    } else if (typeof colTypes === 'undefined') {
        jQuery('body').append('<h2>You must declare a global object named <code>cols</code> with data fields as keys and SQL field types as values.</h2>');
        return;
    }

    // - dat: input data loaded from js/tall.js
    // - colsTypes: input object loaded from js/tall.js with datatable fields as keys and SQL column type as values
    var dat = convertToJSON(inputDat, colTypes);
    var unique = getAllUnique(dat, colTypes);

    return {dat: dat, unique: unique};
}




/**
 * Convert incoming data from app into a JSON formatted object
 *
 * Incoming data is formatted as an array of arrays where each inner array
 * is a row from the original front-end table being viewed in app.
 * This function will reformat into a JSON object where the key for each object
 * will be the column name of the associated data.  This will make manipulation
 * of the data easier down the line.
 *
 * Note that this function will try and convert strings to either int or float if possible.
 *
 * @param {array of arrays} dat - each inner array is the row from the datatable being plotted
 * @global {} colsTypes - keys are datatable fields and values are SQL data type; any key with
 *                        a value of 'excluded' will be removed from the output
 *
 * @return {array}          array of JSON object of converted data where each array element is an object with
 *                          keys as for each column (set by cols).
 */
function convertToJSON(dat, colTypes) {

    var convert = dat.map(function(row) {

        // convert array (row) into object with keys defined by 'cols'
        // http://stackoverflow.com/a/4215753/1153897
        var obj = row.reduce(function(acc, cur, i) {             
            var colName = Object.keys(colTypes)[i];

            // skip any 'excluded' col type
            if (colTypes[colName] !== 'excluded') acc[colName] = convertToNumber(cur);

            return acc;
        }, {});
        return obj;
    });

    return convert;

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
