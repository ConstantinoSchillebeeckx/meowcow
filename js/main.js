/*
TODO
- date picker
- gui setup validation function (needs to be validated against uploaded data)
- implement filtering
*/


function gui() {
    "use strict";

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------
    var options = false,
        container = false,
        canvas = false,
        data = false

    /**
     * TODO
     */
    this.init = function() {

        if (checkIfReady()) {
            buildSkeleton(this.container)
            colTypes = findColumnTypes(data);
            unique = getAllUnique(this.data, colTypes);
            populateGUI(this.options);
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
        sliderValues = {}, // keeps track of all current slider values
        unique = false,
        colTypes = false

    $('.nav-tabs a').click(function (e) {
        e.preventDefault()
        jQuery(this).tab('show')
    })

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
     * Return an array of columns in the loaded dataset
     * that match the given column type as defined by colTypes
     *
     * @param {str} type - [optional] type of columns requested, either interval
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
            return Object.keys(colTypes).filter(function(e) { return filter.indexOf(colTypes[e].type) != -1  })
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
                    generateFormToggle(optionsTab, d.accessor, d.label, d.domClass, d.options); // TODO width of toggle not being calculated - it's due to the tab-pane class I think.
                } else if (d.type == 'slider') {
                    generateFormSlider(optionsTab, d.accessor, d.label, d.domClass, d.options, d.format);
                }
            })

        } else {
            d3.select(optionsTab).style('display','hidden');
        }
    }


    /**
     * Will create the appropriate input element used to 
     * filter the loaded data - the global 'unique' is
     * required in order to properly set the limits for
     * each of the filters.
     */
    function setupPlotFilters() {

        var slider, select;

        // it is required in order to set all the filter limits
        if (typeof unique !== 'undefined') {

            // add tab and container
            addTab(filtersTab, 'Filters');

            // add filter notes
            var note = '<span class="label label-default">NOTE</span> ';
            note += 'each additional filter is combined as an <code>and</code> boolean operation.';
            d3.select(filtersTab).append('div')
                .attr('class','form-group col-sm-10')
                .style('margin-bottom',0)
                .append('p')
                .html(note)

            // filter reset button
            d3.select(filtersTab)
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
     *
     * @return {obj} - each key is a column name, each value
     *   is the column data type (int,float,str,datetime)
     */
    function findColumnTypes(parsedDat) {
        var colMap = {};

        // init with first row vals
        var colNames = Object.keys(parsedDat[0]); // column names
        var colVals = Object.values(parsedDat[0]); // row 1 values
        colNames.forEach(function(d,i) {
            colMap[d] = getDatType(colVals[i]);
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
            });
        });

        return colMap;
    }

    /**
     * Return type of datum, one of either
     * int, float, str, or datetime.
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
                        var colTypes = findColumnTypes(data);
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

        addTab(setupTab, 'Setup', true);
        generateFormSelect(plotTypes(), setupTab, plotTypesID.replace('#',''), "Plot type")
        d3.select(plotTypesID).on('change', plotTypeChange);

        plotTypeChange(); // fire to select first plot type
    }










    /**
     * TODO
     *
     * @return void
    */
    function renderPlot() {

        // clear any previously existent plots/warnings
        jQuery(canvas).empty(); // TODO we should just update the chart if only the options are changed; that way we use the built-in transitions
        jQuery('#warning').empty();


        // get GUI vals
        var guiVals = getGUIvals('form');

        // before rendering anything, let's ensure the selected GUI options make sense to render
        if (guiWarnings(guiVals)) return;
        
        // everything looks good, let's render!
        jQuery('#renderBtn').html('<i class="fa fa-spinner fa-spin"></i>').prop('disabled', true);
        

        // generate facets and group data
        var facets = setupFacetGrid(canvas, guiVals, data, unique);
        var facetRows = Object.keys(facets);
        var facetCols = Object.keys(facets[facetRows[0]]);

        var facetVals = guiVals.plotFacets;
        var hVal = facetVals['horizontal-facet'].value
        var vVal = facetVals['vertical-facet'].value
        var hLabel = facetVals['horizontal-facet'].label
        var vLabel = facetVals['vertical-facet'].label

        // draw plot in each facet
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

                    var chart = populateChart(facetDat, selFacet, guiVals, gui, title);
                }

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
     * Get all unique values for each of the columns provided by the datatable
     *
     * @param {array} dat - Return of convertToJSON. An array of objects where the object key is the column header
     *                and the value is the column value.
     * @param {obj} colTypes - SQL column types for each field
     *
     * @ return {obj} Each key is a column and each value is an array of unique values that column has.
     */

    function getAllUnique(dat, colTypes) {

        var keys = Object.keys(dat[0]); // list of columns for datatable
        var vals = {};

        function sortNumber(a,b) {
            return a - b;
        }

        keys.forEach(function(key) {
            var colType = colTypes[key].type
            if (colType !== 'excluded') {
                var unique = [...new Set(dat.map(item => item[key]))].sort(); // http://stackoverflow.com/a/35092559/1153897
                if (colType == 'int' || colType == 'float') unique = unique.sort(sortNumber); // sort numerically if needed
                vals[key] = unique.map(function(d) { return d });
            }
        })

        return vals;

    }












    /**
     * Once all GUI options and data are set, we can
     * render the C3 plot
     *
     * @param {obj} dat - data for each facet
     * @param {string} sel - selector for facet into which to render plot
     * @param {obj} formVals - GUI option values
     * @param {obj} gui - GUI object
     * @param {string} title - [optional] title for plot, should be null if no title
     *
     * @return void
     */
    function populateChart(dat, sel, formVals, gui, title) {

        var plotType = formVals.plotSetup.plotTypes.value;
        var plotOptions = options.plotTypes[plotType]; // this defines all plot options and accessors
        var datReady = dat;
        var axes = ['x','y','z'];

        // nvd3 expects SVG to exist already
        d3.select(sel).append('svg');

        // parse data if needed before plotting
        var parseFunc = plotOptions.parseData;
        if (typeof parseFunc === "function") {
            datReady = parseFunc(dat);
        }


        // create the chart
        nv.addGraph(function() {
            var chart = nv.models[plotType]()
            
            // setup data accessors for each axis
            // we will need the name of the accessor function to be called on the chart
            // as well as the actual accessor function (which is defined by the GUI)
            axes.forEach(function(d) {
                var accessorName = plotOptions.setup[d].accessor;
                var accessorAttr = formVals.plotSetup[d+'-axis'].value; // get the GUI value for the given chart axis option
                if (accessorName) {
                    var accessorFunc = function(d) { return d[accessorAttr] };
                    chart[accessorName](accessorFunc);
                }
            });

            // set chart options
            plotOptions.options.forEach(function(d) {
                var optionName = d.accessor;
                var optionValue = formVals.plotOptions[optionName]; // get the GUI value for the given chart options
                if (typeof optionValue === 'object') optionValue = optionValue.value; // select value stored as object, get just the value
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
