var GUI = (function() {
    //============================================================
    // GUI class
    //------------------------------------------------------------
    /*
        TODO - docs
        Tabs:
        - setup: defines which data columns are associated with
                 which plot dimension.
        - facets: allows for faceting of data into rows or
                  columns.
        - options: sets the plot options.
        - filter: filter the data to plot only a subset.
        - data: description of the loaded dataset incluing the
                available data columns.
    */

    //============================================================
    // Semantics
    //------------------------------------------------------------
    /*
    config - JSON file that defines setup options for each of the
             plots; this determines which GUI inputs are rendered
    */

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------
    var container = false,  // DOM for GUI and plots
        config = {},        // config details for plots
        data = false,        // incoming pre-filtered data
        colTypes = {},      // overwrite column types with these
        formSubmit,         // form submit function for render
        ignoreCol = []      // columns to ignore in data


    //============================================================
    // Private variables
    //------------------------------------------------------------
    var _unique = false,                 // obj of unique values for each column
        _guiID = 'guiBody',              // ID to give to gui body
        _warningsID = 'warnings',        // ID to give to warnings DOM
        _renderBtnID = 'renderBtn',      // ID for render button
        _plotTypesID = 'plotTypes',      // ID for plot types tab
        _setupTab = 'plotSetup',         // ID for plot setup tab
        _facetsTab = 'plotFacets',       // ID for plot facets tab
        _optionsTab = 'plotOptions',     // ID for plot options tab
        _filtersTab = 'plotFilter',      // ID for plot filters tab
        _dataTab = 'plotData',           // ID for data setup tab
        _facetResetBtn = 'facetsBtn',    // ID for facet reset button
        _filtersResetBtn = 'filtersBtn', // ID for filter reset button
        _uploadModal = 'uploadModal',    // ID for upload modal
        _minRowHeight = 'minRowHeight',  // facet min row height slider ID
        _sliderValues = {},      // keeps track of all current slider values {tabName: {sliderName: val}, ...}
        _dataToRender = false,   // data to be plotted, could be filtered or not
        _guiVals = {},           // storage for gui values
        _guiVals0                // gui values of previous rendered plot

    _guiVals[_setupTab] = {},
    _guiVals[_optionsTab] = {},
    _guiVals[_filtersTab] = {},
    _guiVals[_facetsTab] = {}
    _guiVals0 = JSON.parse(JSON.stringify(_guiVals)) // deep copy


    //============================================================
    // Public getters & setters
    //------------------------------------------------------------    
    this.container = function(d) {
        if (d) { container = d; return this; }
        return container; 
    }
    this.config = function(d) {
        if (d) { config = d; return this; }
        return config; 
    }
    this.data = function(d) {
        if (d || d === false) { data = d; return this; }
        return _dataToRender ? _dataToRender : data.data;
    }
    this.unique = function(d) {
        if (d) { _unique = d; return this; }
        return _unique;
    }
    this.ignoreCol = function(d) {
        if (d) { ignoreCol = d; return this; }
        return ignoreCol; 
    }
    this.colTypes = function(d) {
        if (d) { colTypes = d; return this; }
        return colTypes; 
    }
    this.formSubmit = function(d) {
        if (d) { formSubmit = d; return this; }
        return formSubmit; 
    }
    this.init = function() { // initialize GUI

        // show file upload model to user if no data is loaded
        if (!data) { 
            showModal();
        } else {
            // prep data
            colTypes = findColumnTypes(ignoreCol, colTypes);
            _unique = getAllUnique(colTypes);

            buildContainers();
            populateGUI();
        }

        return this;
    }
    this.facetOptionsHaveChanged = function() {
        var haveChanged = false;
        Object.keys(_guiVals[_facetsTab]).forEach(function(d) {
            if (d != _minRowHeight) { // don't check for change of row height
                if (_guiVals[_facetsTab][d] !== _guiVals0[_facetsTab][d] && !haveChanged) haveChanged = true;
            }
        })
        return haveChanged;
        //return JSON.stringify(_guiVals0[_facetsTab]) !== JSON.stringify(_guiVals[_facetsTab]);
    }
    this.filterOptionsHaveChanged = function() {
        // return true if previou guiVals are not equal to current ones (assuming user is doing some filtering)
        // or if the reset button is on and no filters are being applied (occurs when user manually resets filters)
        return JSON.stringify(_guiVals0[_filtersTab]) !== JSON.stringify(_guiVals[_filtersTab]) || (filtersOn() && Object.keys(_guiVals[_filtersTab].length > 0));
    }
    this.getGUIvals = function() { return _guiVals };





    //============================================================
    // Private functions
    //------------------------------------------------------------    
    /**
     * Call to serializeArray() on the GUI form to return
     * all the current settings of the GUI. 
     *
     * A checked checkbox will return as true, otherwise false
     *
     * @return _guiVals - will set the private var _guiVals formated as
     *   an object of gui values with each tab ID
     *   as a key, the value of which are the input values. Inner
     *   object has input id as the key and values are:
     *   - for mutli select dropdowns, the value is an array of selected
     *     values; for single select, it is the selected value.
     *     note that for the 'None' options the value & key will both be null
     *   - for checkboxes, the value will be true/false
     *   - for sliders the value will be an array of either length
     *     1 for a single value slider, or 2 for a min/max slider
     *
     */
    var getGUIvals = function() {

    
        jQuery('form div.tab-pane').each(function() {
            var tab = this.id;

            // parse select inputs
            var selects = jQuery(this).find(':input').serializeArray();

            var checkBoxes = jQuery(this).find('input[type="checkbox"]');

            // gui vals for filtersTab are set differently.
            // since by default everything is selected we are only
            // interestd in changes from this state or from the
            // previous one
            if (tab != _filtersTab) { 

                // parse selects and text input
                selects.forEach(function(d) {
                    var value = (d.value == "" || d.value == "false" || d.value == false) ? null : d.value;
                    _guiVals[tab][d.name] = value;
                });

                // parse checkboxes
                if (checkBoxes.length) {
                    checkBoxes.each(function(d) {
                        _guiVals[tab][this.id] = this.checked;
                    })
                }

                // parse slider values
                if (tab in _sliderValues) {
                    for (var slider in _sliderValues[tab]) {
                        _guiVals[tab][slider] = _sliderValues[tab][slider];
                    }
                }

                // set a bool for facets on/off
                if (tab == _facetsTab) {
                    _guiVals[_facetsTab].facetOn = (_guiVals[_facetsTab]['col-facet'] != null || _guiVals[_facetsTab]['row-facet'] != null)
                }

            } else { // if filters tab

                // group selects together so multiple select
                // gets stored as an array
                var selects = d3.nest()
                .key(function(d) { return d.name; })
                .entries(selects);

                selects.forEach(function(d) {
                    var values = d.values.map(function(e) { return e.value == "" ? null : e.value});
                    var allPossibleValues = _unique[d.key];

                    if (!arraysEqual(values, allPossibleValues)) {
                        _guiVals[tab][d.key] = values;
                    } else if (d.key in _guiVals[tab]) { // remove filter if previously on
                        delete _guiVals[tab][d.key];
                    }
                });


                Object.keys(colTypes).forEach(function(col) {
                    var colType = colTypes[col];
                    
                    if (colType == 'date' || colType == 'datetime') { // if date filter, there will be two date inputs
                        var currentVal1 = jQuery('#'+col+' input').val();
                        var currentVal2 = jQuery('#'+col+'2 input').val();
                        var originalVal1 = _unique[col][0];
                        var originalVal2 = _unique[col][_unique[col].length - 1];
        
                        if (currentVal1 != originalVal1 || currentVal2 != originalVal2) {
                            _guiVals[tab][col] = [currentVal1, currentVal2];
                        } else if (col in _guiVals[tab]) { // remove filter if previously on
                            delete _guiVals[tab][col];
                        }
                    } else if (colType == 'float' || colType == 'int') { // if slider
                        var sliderObj = d3.select('#'+col).node().noUiSlider
                        var startVals = sliderObj.options.start;
                        var prevVals = _guiVals0[_filtersTab][col];
                        var currentVals = sliderObj.get().map(function(d) { return convertToNumber(d); })

                        if (startVals[0] != currentVals[0] || startVals[1] != currentVals[1]) {
                            _guiVals[tab][col] = _sliderValues[tab][col];
                        } else if (col in _guiVals[tab]) { // remove filter if previously on
                            delete _guiVals[tab][col];
                        }
                    }
                })
            }
        })

        return _guiVals;

    }


    // https://stackoverflow.com/a/16436975/1153897
    function arraysEqual(a, b) {
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (a.length != b.length) return false;

        for (var i = 0; i < a.length; ++i) {
            if (convertToNumber(a[i]) !== convertToNumber(b[i])) return false;
        }
        return true;
    }

    /**
     * Return an obj of plotTypes available in the specified config.
     * obj keys will be the plot type select value,
     * obj values will be the select label
     */
    var getPlotTypes = function() { 
        var tmp = {}; 
        for (var plotType in config.plotTypes) {
            var dat = config.plotTypes[plotType];
            var key = 'label' in dat ? dat.label : plotType;
            tmp[key] = plotType;
        }
        return tmp;
    };

    var filtersOn = function() { return jQuery('#'+_filtersResetBtn).attr('style') !== "display: none;"; } // can't use .is(":visible") because tab must be active for that to work
    var getPlotConfig = function() { return config.plotTypes[getPlotType()]; }; // get config for currently selected plot
    var getPlotOptions = function(plotType) { return getPlotConfig().options; }; // get options for current plot
    var getPlotType = function() { return jQuery('#'+_plotTypesID).val(); }; // get currently selected plot type
    var getAllowFacets = function() { return 'allowFacets' in getPlotConfig() ? getPlotConfig().allowFacets : true; }; // bool for whether facets allowed, default true

    var getAvailableAxes = function() { 
        var plotType = getPlotType() || Object.keys(config.plotTypes)[0];
        return config.plotTypes[plotType].axes; 
    }; // get axes in config for plot


    /**
     * Given a variable of unkown type, 
     * return type of datum, one of either int, 
     * float, str, datetime or date.
     *
     * @param {str} mixedVar
     *
     * @return - will return the variable type as one
     *   of either int, float, str, datetime or date;
     *   in the case where the input variable matches
     *   config.missing, false is returned
     */
    function getDatType(mixedVar) {

        if (config.missing && config.missing == mixedVar) return false; 

        if (!isInt(mixedVar) && !isFloat(mixedVar) && isDate(mixedVar, 'YYYY-MM-DD HH:mm:ss')) return 'datetime';
        if (!isInt(mixedVar) && !isFloat(mixedVar) && isDate(mixedVar, 'YYYY-MM-DD')) return 'date';
        if (!isInt(mixedVar) && !isFloat(mixedVar) && !isDate(mixedVar) && isStr(mixedVar)) return 'str';
        if (isInt(mixedVar) && !isFloat(mixedVar) && !isStr(mixedVar)) return 'int';
        if (!isInt(mixedVar) && isFloat(mixedVar) && !isStr(mixedVar)) return 'float';
        return false;
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
    // return true if val matches date format
    // 'YYYY-mm-dd hh:mm:ss'
    function isDate(val, format) {
        if (typeof format === 'undefined') format = 'YYYY-MM-DD HH:mm:ss' // default to sql timestamp
        return moment(val, format).format(format) === val;
        //return !isNaN(Date.parse(val))
    }


    /**
     * Get all unique values for each of the columns provided by the dataset.
     *
     * Note that only data for those columns defined in colTypes will be returned>
     *
     * @param {obj} colTypes - SQL column types for each field
     *
     * @ return {obj} Each key is a column and each value is an array of unique values that column has.
     */
    function getAllUnique(colTypes) {

        var colNames = Object.keys(colTypes); // list of columns for datatable
        var vals = {}, dat = data.data;

        function sortNumber(a,b) {
            return a - b;
        }

        colNames.forEach(function(colName) {
            var colType = colTypes[colName]
            if (colType !== 'excluded') {
                var unique = [...new Set(dat.map(item => item[colName]))].sort(); // http://stackoverflow.com/a/35092559/1153897
                if (colType == 'int' || colType == 'float') unique = unique.sort(sortNumber); // sort numerically if needed
                vals[colName] = unique.map(function(d) { return d == config.missing ? null : d });
            }
        })

        return vals;

    }


    /**
     * When a user loads a dataset, this function will
     * inpsect the parsed data and determine the data
     * type for each column as 'int','float','str',
     * 'datetime' or 'date'
     *
     * NOTE: function will also replace missing values with null for
     *       the var 'data'
     *
     * TODO - scanning through entire dataset here as well as with getAllUnique()
     *
     * @param {array, optional} ignoreCol - list of column names to ignore
     *   from output object; this is how a user can ignore columns
     *   present in their data.
     * @param colTypes {obj, optional} - same format as the output of this
     *   function; allows user to manually overwrite a column type. e.g.
     *   if all subjects are identified with a numeric ID, but user still
     *   wants to treat this as a str.
     *
     * @return {obj} - each key is a column name, each value
     *   is the column data type (int,float,str,datetime,date)
     */
    function findColumnTypes(ignoreCol, colTypes) {
        var colMap = {}, dat = data.data;

        // add colTypes keys (column names) to the ignore list
        // we will manually add them in before the return
        if (colTypes && Object.keys(colTypes).length) ignoreCol.concat(Object.keys(colTypes));

        // init with first row vals
        var colNames = Object.keys(dat[0]); // column names
        var colVals = Object.values(dat[0]); // row 1 values
        colNames.forEach(function(d,i) {
            if (ignoreCol.indexOf(d) == -1) colMap[d] = getDatType(colVals[i]);
        })


        // check each row for the data type
        // we only update things if the data
        // type 'trumps' the first row
        // 'trump' order is int, float, datetime,
        // str meaning a float type will convert trump
        // an int
        var trump = {'int':0, 'float':1, 'datetime': 2, 'date': 2, 'str':3}
        dat.forEach(function(d, j) {
            var rowVal = Object.values(d);

            colNames.forEach(function(col,i) {
                if (ignoreCol.indexOf(col) == -1 ) {
                    var currentType = colMap[col];
                    var valType = getDatType(rowVal[i]);

                    if (valType === false) {
                        d[col] = null; // if a missing value, replace with null
                        return;
                    }

                    if (currentType === 'str') return; // can't change to anything else, so return

                    if (valType && valType !== currentType) { // if type is different than currently stored
                        if (valType == 'datetime' || valType == 'str' || valType == 'date') {
                            // if previously a number (int or float) and changing to either datetime or str, make it a str
                            colMap[col] = 'str';
                        } else if (trump[valType] > trump[currentType]) { 
                            colMap[col] = valType;
                        } else if (trump[valType] < trump[currentType] && (currentType == 'datetime' || currentType == 'date')) { 
                            // if previously a datetime, and we get anything else, convert to str
                            colMap[col] = 'str';
                        } else if (currentType === false) { // in case first row value is missing, this assigns with the next row value type
                            colMap[col] = valType;
                        }
                    }
                }
            });
        });

        // update global
        data.data = dat;

        // manually add in user specified column type
        if (colTypes) {
            Object.keys(colTypes).forEach(function(d,i) {
                colMap[d] = Object.values(colTypes)[i];
            })
        }

        return colMap;
    }

    /**
     * load the selected toy data set into the proper
     * data variables and initialize the gui/plot
     *
     * NOTE: datasets are stored in js/toyData.js
     *
     * @param {str} set - name of dataset to load
     *
     */
    function loadToydata(set) {
        data = toyData[set];
        ignoreCol = [];
        colTypes = {};
        init();
        jQuery('#'+_uploadModal).modal('hide');
    }

    /**
     * onClick event handler for uploading data, called
     * when users selects a file to upload from the
     * upload modal. 
     *
     * Function will check that a parseable filetype
     * has been passed (plain-text with some sort of
     * delimiter). If so, colTypes and unique are
     * calculated and the user is show how the file
     * was parsed.
     */
    function uploadData() {

        // parse file
        $('input[type=file]').parse({
            config: {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: function(results, file) {
                    data = {};
                    data.data = results.data;
                    var meta = results.meta;
                    var errors = results.errors;

                    // clear modal body
                    var modalBody = d3.select('#modalBody')
                    modalBody.html('');
                    jQuery('#uploadDone').remove();

                    if (errors.length) { // if there was an error parsing input file
                      
                        jQuery('.modal-content').addClass('panel-danger');
 
                        // just grab first error for now
                        var errorText = '<span class="text-danger fa fa-exclamation " aria-hidden="true"></span> ' + errors[0].message;
                        if (typeof errors[0].row !== 'undefined') errorText += " - error found in row " + errors[0].row;
                        modalBody.append('h4')
                            .attr('class','lead')
                            .html(errorText)
                    } else { // parsed input file is ok

                        jQuery('.modal-content').removeClass('panel-danger').addClass('panel-info');
                        init()
                        jQuery('#'+_uploadModal).modal('hide');

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
     * Automatically called if data isn't yet loaded
     */
    function showModal() {

        // if modal doesn't already exist, create it
        if (jQuery('#'+_uploadModal).length === 0) {
        
            var modal = d3.select('body').append('div')
                .attr('class','modal fade')
                .attr('tabindex',-1)
                .attr('role','dialog')
                .attr('id',_uploadModal)
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
            
            var text = "Looks like you don't have any data loaded, " + (config.useToyData ? 'please choose either a toy data set or upload your own file.' : 'please upload your own data.')
            modalBody.append('div')
                .attr('class','row')
                .append('div')
                .attr('class','col-sm-12')
                .attr('id','modalBody')
                .append('h4')
                .attr('class','lead')
                .text(text)

            var btnRow = modalBody.append('div')
                .attr('class','row')
                .append('div')
                .attr('class','col-sm-12')

            if (config.useToyData) {
                    
                btnRow.append('h4')
                    .html('Datasets:')

                Object.keys(toyData).forEach(function(d) {

                    btnRow.append('label')
                        .attr('id',d+'ToyData')
                        .attr('class','btn btn-info btn-file')
                        .style('margin-right','5px')
                        .text(function() { return d; })
                        .on('click',function() { loadToydata(d)} )
                })
            }

            btnRow.append('label')
                .attr('class','btn btn-primary btn-file')
                .text('Choose file')
                .append('input')
                .attr('type','file')
                .style('display','none')
                .on('change',uploadData)

            jQuery('#'+_uploadModal).modal('show');
        }
            
    }



    /**
     * Return an array of columns in the loaded dataset
     * that match the requested data type
     *
     * @param {str} type - type of columns requested, either quantitative
     *   (int, float) or ordinal (str, datetime); if not provided, will return
     *   colTYpes
     *
     * @return {array/obj} 
     *  - column names that match column type
     *  - obj of available data columns if no type provided
     */
    var getColsByType = function(type) { // return colTypes keys that match the given type [interval/ordinal]
        if (typeof type !== 'undefined') {
            var filter = type == 'quantitative' ? ['int','float'] : type == 'ordinal' ? ['datetime','str'] : ['int','float','datetime','str'];
            return Object.keys(colTypes).filter(function(e) { return filter.indexOf(colTypes[e]) != -1  })
        }
    };

    /**
     * Function that's called each time the plotType changes;
     * it will update all the setup tab and the options tab
     */
    function plotTypeChange() {
        makeSetupTab();
        makeOptionsTab();
    }

    /**
     * Will create the appropriate input element used to 
     * filter the loaded data - the global 'unique' is
     * required in order to properly set the limits for
     * each of the filters.
     *
     */
    function makeFiltersTab() {

        var slider, select;

        // it is required in order to set all the filter limits
        if (typeof _unique !== 'undefined') {

            // add tab and container
            var note = 'Use the inputs below to filter the plotted data.';
            note += '<br><span class="label label-default">NOTE</span> ';
            note += 'each additional filter is combined as an <code>and</code> boolean operation.'; 
            addTab(_filtersTab, 'Filters', note);

            // generate an input for each of the columns in the loaded dataset
            for (var col in colTypes) {
                var colType = colTypes[col]
                var colVals = _unique[col];

                if (colType == 'int' || colType == 'float') { // if a number, render a slider
                    colVals = d3.extent(_unique[col]);
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
                    var opts =  {id:col, label:col, domClass:'col-sm-4 filterInput', options:sliderOptions, format:format}
                    slider = generateFormSlider(_filtersTab, opts);
                    if (slider) { 
                        slider.noUiSlider.on('start',function() { 
                            showButton(_filtersResetBtn) // activate reset button
                        })
                    }

                } else if (colType == 'str') { // if categorical, render a select
                    var opts = {
                        values:colVals, 
                        id:col, 
                        label:col, 
                        domClass:'col-sm-4 filterInput', 
                        attributes:{
                            multiple:true,
                            'data-actions-box':true
                        },
                        selectAll: true
                    };
                    select = generateFormSelect(_filtersTab, opts);
                    select.on('change',function() { 
                        showButton(_filtersResetBtn) // activate reset button
                    });
                } else if (colType == 'datetime' || colType == 'date') {
                    var opts = {values:colVals, accessor:col, label:col, type:colType, range:true, domClass:'col-sm-8'};
                    generateDateTimeInput(_filtersTab, opts);

                    jQuery('#'+col).on('dp.change', function() { 
                        showButton(_filtersResetBtn) // activate reset button
                        var picker1 = this.id;
                        var picker2 = this.id + '2';
                    })
                    if (opts.range) jQuery('#'+col+'2').on('dp.change', function() { 
                        showButton(_filtersResetBtn) // activate reset button
                        var picker1 = this.id.replace(/2$/,"");
                        var picker2 = this.id;
                    })
                }
            }

            // filter reset button
            // initially hide it
            d3.select('#'+_filtersTab)
                .append('div')
                .attr('class','note col-sm-2 col-sm-offset-10')
                .style('margin-bottom',0)
                .append('button')
                .attr('id',_filtersResetBtn)
                .attr('class','btn btn-warning btn-xs pull-right')
                .attr('disabled','disabled')
                .style('display','none')
                .on('click', function() { resetInputs(_filtersTab, _filtersResetBtn) })
                .text('Reset filters');
   
        }

        addClearFix(_filtersTab);
    }


    /**
     * called on each plot type change, shows the proper inputs
     * for the requested plot type based on the defined plot
     * options.
     *
     */
    function makeOptionsTab() {

        var plotOptions = getPlotOptions();

        // clear out form input in case there was a plotType change
        d3.selectAll('#'+_optionsTab+' .form-group').remove();

        // add tab and container
        var note = 'Use the inputs below to adjust options of the plot.';
        addTab(_optionsTab, 'Options', note);

        if (plotOptions) {


            plotOptions.forEach(function(d) {

                if (d.type == 'select') {
                    generateFormSelect(_optionsTab, d);
                } else if (d.type == 'toggle') {
                    generateFormToggle(_optionsTab, d); // TODO width of toggle not being calculated - it's due to the tab-pane class I think.
                } else if (d.type == 'slider') {
                    generateFormSlider(_optionsTab, d);
                } else if (d.type == 'text' || d.type == 'number') {
                    generateFormTextInput(_optionsTab, d)
                }

            })


        } else {

            var formGroup = d3.select('#'+_optionsTab).append('div')
                .attr('class', 'form-group col-sm-12')
                .html('No plot options were specified for the plot type <code>' + getPlotType() + '</code>.')

        }

        addClearFix(_optionsTab);
    }

    /**
     * called on each plot type change, shows the proper inputs
     * for the requested plot type based on the defined plot
     * options and whether allowFacets = true, if false
     * the row will be hidden
     *
     */
    function makeFacetsTab() {

        if (getAllowFacets()) {

            // add tab and container
            var note = 'Facets form a matrix of panels defined by row and column facetting variables; it is used to draw plots';
            note += ' with multiple axes where each axes shows the same relationship conditioned on different levels of some variable.';
            addTab(_facetsTab, 'Facets', note);

            ['col','row'].forEach(function(d) {
                var cols = getColsByType('ordinal');
                var opts = {domClass: 'col-sm-3', values:cols, id:d+'-facet', label:(d == 'col') ? 'Columns' : 'Rows', addOption:{'None':''}}
                var select = generateFormSelect(_facetsTab, opts);
                select.on('change',function() { showButton(_facetResetBtn) }); // activate reset button
            });

            var input = generateFormTextInput(_facetsTab, {id:'colWrap', label:'Column wrap', type:'number', domClass: 'col-sm-3',});
            input.on('change',function() { showButton(_facetResetBtn) }); // activate reset button

            var opts = {
                options: {start: 100, range: {'min':100, 'max':500}, step:1, connect: [true, false]},
                format: function(d) { return '[' + parseInt(d) + 'px]' },
                id:_minRowHeight, label:'Min row height', minValueReplace: 'Auto', showValueReplace: true,
                domClass: 'col-sm-3',
            }
            var slider = generateFormSlider(_facetsTab, opts);
            slider.noUiSlider.on('start',function() { showButton(_facetResetBtn) }); // activate reset button

            // reset button
            // initially hide it
            d3.select('#'+_facetsTab)
                .append('div')
                .attr('class','note col-sm-2 col-sm-offset-10')
                .style('margin-bottom',0)
                .append('button')
                .attr('id',_facetResetBtn)
                .attr('class','btn btn-warning btn-xs pull-right')
                .attr('disabled','disabled')
                .style('display','none')
                .on('click', function() { resetInputs(_facetsTab, _facetResetBtn)} )
                .text('Reset facets');
        } else {
            d3.select(_facetsTab).style('display','hidden');
        }
    }


    function capitalize(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }



    /**
     * called on each plot type change, shows the proper x,y,z,
     * select options that will define the plots axes
     *
     * @param {str} tabID - ID for tab into which to add DOM
     *   elements (e.g. '#setupTab')
     *
     */
    function makeSetupTab() {

        var availableAxes = getAvailableAxes();

        // delete all but first form input in case there was a plotType change
        // since each plot type may not have the same axes setup
        d3.selectAll('#'+_setupTab+' .form-group').filter(function(d,i) { return i > 0}).remove();

        availableAxes.forEach(function(axisSetup,i) {
            if ('type' in axisSetup && 'accessor' in axisSetup) {
                var cols = getColsByType(axisSetup.type);
                var label = "label" in axisSetup ? axisSetup.label : axisSetup.accessor;
                var domClass = (i > 1 && (i + 1) % 2) ? 'col-sm-4 col-sm-offset-4' : 'col-sm-4'; // offset so nothing under plot type select
                var opts = {values:cols, id:axisSetup.accessor, label:capitalize(label), domClass:domClass, addOption:axisSetup.addOption};
                generateFormSelect(_setupTab, opts);
            }
        });
    }

    /*
     * Create a tab that details the loaded
     * data including the columns, column
     * type and column values
     */
    function makeDataTab() {

        var note = '';
        var numShow = 20; // if column type is str, show this many number of possible values

        // add tab and container
        ['description','source','meta'].forEach(function(d) { 
            if (data[d]) {
                note += '<dl class="dl-horizontal">';
                note += '<dt><span class="label label-primary">' + capitalize(d) + '</span></dt>';
                note += ' <dd>' + data[d] + '</dd></dl>';
            }
        });

        note += 'The currently loaded data has the following attributes:';
        addTab(_dataTab, 'Data', note);

        var ol = d3.select('#'+_dataTab).append('div')
            .attr('class','col-sm-12')
            .append('ol')

        Object.keys(colTypes).forEach(function(attrName) {
       
            var attrType = colTypes[attrName];

            var typeText = 'type: <code>' + attrType + '</code> ';
            var valText = '';
            var colVals = _unique[attrName];
            var colDescription;
            if ('colDescription' in data) {
                colDescription = data.colDescription[attrName]; 
            }

            if (attrType == 'int' || attrType == 'float') {
                valText = 'range: [' + d3.extent(colVals) + ']';
            } else if (attrType == 'str') {
                valText = 'values: <mark>';
                if (colVals.length > numShow) {
                    valText += colVals.slice(0, numShow).join(', ') + ' ...</mark>';
                } else {
                    valText += colVals.join(', ') + '</mark>';
                }
            } else if (attrType == 'datetime' || attrType == 'date') { 
                valText = '<kbd>' + _unique[attrName][_unique[attrName].length - 1] + '</kbd> to <kbd>' + _unique[attrName][0] + '</kbd>';
            }

            var ul = ol.append('li')
                .html('<b>' + attrName + '</b>')
                .append('ul')

            if (colDescription) {
                ul.append('li')
                    .html(colDescription);
            }
            ul.append('li')
                .html(typeText);
            ul.append('li')
                .html(valText);
        })

    }


    /**
     * Parse setup and generate the remaining
     * tabs and content by calling plotTypeChange();
     */
    function populateGUI() {

        var note = 'Choose the type of plot to be rendered along with the proper data for each axis.';
        addTab(_setupTab, 'Setup', note, true);

        var select = generateFormSelect(_setupTab, {values:getPlotTypes(), id:_plotTypesID, label:"Plot type"})
        select.on('change', plotTypeChange);

        makeSetupTab();
        makeFacetsTab();
        makeOptionsTab();
        makeFiltersTab();
        makeDataTab();
        jQuery("#" + _setupTab + 'Tab a').tab('show'); // show setup tab

    }

    /**
     * Add clearfix so that columns wrap properly
     *
     * @param {str} - tab ID selector name
     *   (e.g. setupTab)
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
     * Append a tab to the GUI, assume ul .nav already exists
     *
     * @param {str} id - ID to give to tab-content tab, this
     *  will also set the .nav li element with an id of
     *  id + 'Tab'
     * @param {str} text - label text for tab, html allowed
     * @param {str} note - descriptive text explaining tab,
     *   html allowed
     * @param {bool} active - whether to give the tabpanel 
     *  the 'active' class
     *
     * Note that tab will not be generated if it already
     * exists.
     */
    function addTab(id, text, note, active) {

        if (jQuery('#' + id + 'Tab').length) return;

        var a = d3.select('.nav').append('li')
            .attr('role','presentation')
            .attr('class', function() { return active ? 'active' : null})
            .attr('id', id + 'Tab')
            .append('a')
            .attr('role','tab')
            .attr('data-toggle','tab')
            .attr('href','#'+id)
            .html(text)

        var tab = d3.select('.tab-content').append('div')
            .attr('role','tabpanel')
            .attr('class', function () { return active ? 'tab-pane row active' : 'tab-pane row'})
            .attr('id',id)

        // add instructions
        if (typeof note !== 'undefined') {
            tab.append('div')
                .attr('class','col-sm-12 note')
                .style('margin-bottom',0)
                .append('p')
                .html(note);
        }
    }


    /** 
     * Build the GUI bootstrap panel and the warnings DOM.
     *
     * Will setup all the proper DOM elements for the GUI including
     * a containing bootstrap row (#gui) that includes two full
     * full width (col-sm-12) columns (#guiPanel & _warningsID)
     *
     * If required data is not present, tabs won't be generated,
     * instead a message is displayed with an upload button that calls
     * uploadData()
     * 
     * The GUI is further madeup of various tabs:
     * - #plotSetup: contains all the selects to define the plot type
     *   as well as the axis definitions.
     * - #plotFacets: contains selects for defining the facets of the
     *   plot
     * - #plotOptions: contains all teh selects to set the options for
     *   the given plotType
     * - #plotRender: contains the render button
     *
     *
     * @private {str} container - class or id of DOM in which to build GUI
     *
     */
    function buildContainers() {

        // setup containers
        var guiRow = d3.select(container);

        var guiCol = guiRow.append("div")
            .attr("class","col-sm-12")
            .attr('id','guiPanel');

        var warningsCol = d3.select(container)
            .append("div")
            .attr("class","col-sm-12")
            .attr("id",_warningsID);


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
            .attr('href','#'+_guiID)
            .text('GUI')

        var form = panel.append('div')
            .attr('id',_guiID)
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
            .attr('id',_renderBtnID)
            .on('click', preRender);
    }


    /**
     * on click event handler for 'Render' button. will check all the user set
     * GUI values and ensure plots can be rendered. if everything looks ok
     * the formSubmit function is called, otherwise void is returned.
     *
     */
    function preRender() {

        _guiVals0 = JSON.parse(JSON.stringify(_guiVals)) // deep copy

        // get GUI vals
        getGUIvals(); // this updates _guiVals

        // before rendering anything, let's ensure the selected GUI options make sense to render
        if (!validateGUIsettings(_guiVals)) return;

        // filter data if needed
        if (filterOptionsHaveChanged() && Object.keys(_guiVals[_filtersTab]).length) {
            filterData(data.data, _guiVals[_filtersTab], function() { formSubmit() }); // will update _dataToRender
        } else {

            // everything looks good, let's render!
            _dataToRender = data.data;
            formSubmit();
        }


    }

    /**
     * filter attached data to reduce what is being plotted
     *
     * @param {list} dat - data to filter
     * @param {obj} filters - filter data from GUI with data column
     *   as key, and filter value as the value; value format
     *   changes based on the type of form input: 
     *   - dropdowns: the value will be formatted as an object 
     *     with keys 'label' and 'value'. 
     *   - slider: values are formatted as an array of
     *     length 1 or 2 depending on the number of handles. 
     *   - date: formatted like dropdowns, however there will
     *     be a second obj key named like the first but with 
     *     an appended '2', since dates are setup as ranges.
     * @param {func} _callback
     * 
     * @return void - sets _dataToRender variable
     */
    function filterData(dat, filters, _callback) {

        // go through data and apply filters
        _dataToRender = dat.filter(function(datRow) {
            var keep = true; 
            var filterCols = Object.keys(filters);
            for (var i = 0; i < filterCols.length; i++) {
                var filter = filterCols[i];
                var filterType = colTypes[filter]; // str, datetime, date or float
                var filterVals = filters[filter];
                var rowVal = datRow[filter];
                if (filterType == 'str') {
                    if (filterVals.indexOf(rowVal) == -1) keep = false;
                } else if (filterType == 'float' || filterType == 'int') {
                    if (rowVal < filterVals[0] || rowVal > filterVals[1]) keep = false;
                } else if (filterType == 'datetime' || filterType == 'date') {
                    rowVal = moment(rowVal);
                    if (rowVal.isBefore(filterVals[0]) || rowVal.isAfter(filterVals[1])) keep = false;
                }
    
                if (keep === false) return keep; // this makes filter an AND on all columns
            };
            return keep;
        })

        if (typeof _callback === "function") _callback();

    }

    /**
     * Check GUI for errors in option choices, if
     * an error exists, display a warning
     *
     * @param {obj} guiVals - return from getGUIvals()
     *
     * @return false on error, true on no error
     */
     function validateGUIsettings(guiVals) {

        var setupVals = guiVals[_setupTab];
        var facetVals = guiVals[_facetsTab];
        var wrapVal = facetVals.colWrap == null ? 0 : facetVals.colWrap;

/*
        TODO - not sure how we can do this check since we can't guarantee field names like x or y
        if (setupVals['x-axis'] == setupVals['y-axis']) { // ensure x & y axis are different
            displayWarning("The X-axis field cannot be the same as the Y-axis field, please change one of them!", _warningsID, true);
            return false;
        }
*/

        // check that selected plot type is an option in nv.models (should be a key)
        if (!(setupVals.plotTypes in nv.models)) {
            displayWarning("The plot type <code>" + setupVals.plotTypes + "</code> is not a valid NVD3 model, please check the documentation.", _warningsID, true);
            return false;
        }

        // TODO further checks

        if (facetVals.facetOn || wrapVal > 0) {
            var colVal = facetVals['col-facet']
            var rowVal = facetVals['row-facet']
            var facetRows = (colVal) ? _unique[colVal] : [null];
            var facetCols = (rowVal) ? _unique[rowVal] : [null];

            if (colVal === null && rowVal === null && wrapVal === null) {
                displayWarning("In order to use facets, you must at least choose something for <code>Rows</code> or <code>Columns</code>", _warningsID, true);
                return false;
            }
            if (wrapVal > 0 && rowVal !== null) {
                displayWarning("You cannot specify a <code>Rows</code> option when specifying <code>Column wrap</code>.", _warningsID, true);
                return false;
            }
            if (rowVal === colVal) {
                displayWarning("You cannot choose the same field for both <code>Rows</code> and <code>Columns</code> options.", _warningsID, true);
                return false;
            }
            if (facetRows.length > 50 || facetCols.length > 50) { // limit how many facets can be rendered
                displayWarning("Cancelling render because too many facets would be created.", _warningsID, true);
                return false;
            }
        }
        return true;
    }

    /**
     * Generate a datetime input picker
     * https://github.com/Eonasdan/bootstrap-datetimepicker
     *
     * @param {string} selector - element to which to add form-group (label and select)
     * @param {obj} opts - options for datetime picker, can contain the following keys:
     * @key {array} values - array of all dates in dataset in ascending order
     * @key {string} accessor - id/name to give to input
     * @key {string} label - label text
     * @key {bool} range - whether datepicker should be formatted as range - this will generate
     *   two datetime pickers
     * @key {str} type - type of picker, 'datetime' or 'date'
     */
    function generateDateTimeInput(selector, opts) {
        if (typeof opts.addOption === 'undefined') opts.addOption = false;
        if (typeof opts.domClass === 'undefined' || opts.domClass == false) opts.domClass = 'col-sm-4';
        var id = opts.accessor
        opts.label = typeof opts.label === 'undefined' ? id : opts.label; // in case label not set in options, use the id

        // default picker options
        var pickerOptions = 'options' in opts ? opts.options : {};
        pickerOptions.showTodayButton = true;
        pickerOptions.format = opts.type == 'datetime' ? "YYYY-MM-DD HH:mm:ss" : "YYYY-MM-DD";

        var formGroup = inputHeader(selector, opts);

        // generate another row within formgroup
        // so we can easily dimension one/two pickers
        var pickerRow = formGroup.append('div')
            .attr('class','row')
            
        var pickerCol = pickerRow.append('div')
            .attr('class', function() { return 'datetimepickers ' + (opts.range ? ' col-sm-6' : ' col-sm-12');});

        var pickerDT = buildDateTimePicker(pickerCol, id);
        var picker1 = '#'+id;

        jQuery(picker1).datetimepicker(pickerOptions); // activate

        // if date range required, add second picker
        if (opts.range === true) {

            var pickerCol = pickerRow.append('div')
                .attr('class','col-sm-6 datetimepickers')

            var pickerDT2 = buildDateTimePicker(pickerCol, id+'2');
            var picker2 = '#'+id+'2';
            jQuery(picker2).datetimepicker(pickerOptions); // activate

            jQuery(picker2).datetimepicker({
                useCurrent: false //Important! See issue #1075
            });
            jQuery(picker1).on("dp.change", function (e) {
                jQuery(picker2).data("DateTimePicker").minDate(e.date);
            });
            jQuery(picker2).on("dp.change", function (e) {
                jQuery(picker1).data("DateTimePicker").maxDate(e.date);
            });

            // set placeholders
            jQuery(picker1 + ' input').attr('placeholder','start')
            jQuery(picker2 + ' input').attr('placeholder','end')

            // set min/max date
            jQuery(picker1).data("DateTimePicker").date(moment(opts.values[0]));
            jQuery(picker2).data("DateTimePicker").date(moment(opts.values[opts.values.length - 1]));
        }

        return pickerDT;
    }

    /**
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
            .attr('id',id);

        picker.append('input')
            .attr('type','text')
            .attr('class','form-control')
            //.attr('id',id)
            //.attr('name',id);
        
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
     *   (e.g. 'setupTab')
     * @param {obj} opts - options for select, can contain the following keys:
     * @key {array/obj}  values - list of options to populate select with. If an
     *   array is passed, both the select value and text will be the set with the
     *   array elements; if an object is passed keys will be the option label and
     *   obj values will be the option value.
     * @key {string} id - id/name to give to select
     *   (e.g. 'colorValue')
     * @key {string} label - label text
     * @key {str} domClass - (optional, default=col-sm-4) class to assign to 
     *   div containing input, should be a boostrap column class type (e.g. col-sm-3)
     * @key {str/obj} addOption - (optional, default=False) whether to prepend an additional option
     *  in the select list, allows for things like 'All' or 'None' - note this will be the first option
     * @key {obj} attributes - (optional) optional attributes to apply to select e.g. {multiple: true}
     * @key {bool} selectAll - whether to pre-select all options
     *
     * @return select DOM
     *
     */
    function generateFormSelect(selector, opts) {

        if (typeof opts.addOption === 'undefined') opts.addOption = false;
        if (typeof opts.domClass === 'undefined' || opts.domClass == false) opts.domClass = 'col-sm-4';
        var id = opts.id ? opts.id : opts.accessor
        opts.label = typeof opts.label === 'undefined' ? id : opts.label; // in case label not set in options, use the id

        var formGroup = inputHeader(selector, opts);

        var numOptions = Array.isArray(opts.values) ? opts.values.length : Object.keys(opts.values).length;

        var select = formGroup.append('select')
            .attr('class','form-control selectpicker')
            .attr('id',id)
            .attr('name',id)

        if (opts.attributes) {
            for (attr in opts.attributes) {
                select.attr(attr, opts.attributes[attr]);
            }
        }

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

        if (opts.selectAll) jQuery('#'+id).selectpicker('selectAll');

        return select;

    }

    /**
     * Generate a text input
     *
     * @param {string} selector - element to which to add form-group (label and select)
     *   (e.g. 'setupTab')
     * @param {obj} opts - options for select, can contain the following keys:
     * @key {string} id - id/name to give to input
     * @key {string} label - label text
     * @key {str} domClass - (optional, default=col-sm-4) class to assign to 
     *   div containing input, should be a boostrap column class type (e.g. col-sm-3)
     * @key {str} type - type of input, 'text' or 'number'
     */
    function generateFormTextInput(selector, opts) {

        if (opts.type != 'number' && opts.type != 'text') return;

        if (typeof opts.required === 'undefined' || opts.required === null) opts.required = false;
        if (typeof opts.domClass === 'undefined' || opts.domClass == false) opts.domClass = 'col-sm-4';
        var id = opts.id ? opts.id : opts.accessor
        opts.label = typeof opts.label === 'undefined' ? id : opts.label; // in case label not set in options, use the id
        

        var formGroup = inputHeader(selector, opts);

        var input = formGroup.append('input')
            .attr('class','form-control')
            .attr('id',id)
            .attr('name',id)
            .attr('required',opts.required)
            .attr('type',opts.type);
   
        if (typeof opts.setDefault !== 'undefined') input.attr('value',opts.setDefault); 

        return input;
    }

    /**
     * Generate a bootstrap toggle input
     *
     * @param {string} selector - element to which to add form-group (label and select)
     *   (e.g. 'setupTab')
     * @param {obj} opts - options for select, can contain the following keys:
     * @key {string} id - id/name to give to toggle
     * @key {string} label - label text
     * @key {str} domClass - (optional, default=col-sm-4) class to assign to 
     *   div containing input, should be a boostrap column class type (e.g. col-sm-3)
     * @key {obj} options - toggle options, see http://www.bootstraptoggle.com/ API
     */
    function generateFormToggle(selector, opts) {

        if (typeof opts.domClass === 'undefined' || !opts.domClass) opts.domClass = 'col-sm-2';
        var id = opts.id ? opts.id : opts.accessor
        opts.label = typeof opts.label === 'undefined' ? id : opts.label; // in case label not set in options, use the id
        var formGroup = inputHeader(selector, opts);
            
        formGroup.append('br')

        var toggle = formGroup.append('input')
            .attr('type','checkbox')
            .attr('data-toggle','toggle')
            .attr('id',id)
            .attr('name',id);

        jQuery('input#'+id).bootstrapToggle(opts.options); //activate
        if (opts.setDefault) jQuery('input#'+id).bootstrapToggle('on'); // set default on 

    }

    /**
     * Generate a noUiSlider range input
     *
     * @param {string} selector - element to which to add form-group (label and select)
     * @param {obj} opts - options for select, can contain the following keys:
     * @key {string} id - id/name to give to toggle
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
            opts.options = { // default slider if no options provided
                start:[50],
                step: 1,
                range: {
                    min: 0,
                    max: 100
                }
            };
        }

        // need min != max to render a slider
        if (opts.options.range.min == opts.options.range.max) return;

        // ensure range is made up of only numbers
        // may not be the case if missing values aren't
        // converted in dataset
        var minType = getDatType(opts.options.range.min)
        var maxType = getDatType(opts.options.range.max)
        if (['float','int'].indexOf(minType) == -1) opts.options.range.min = 0
        if (['float','int'].indexOf(maxType) == -1) opts.options.range.max = 0

        var id = opts.id ? opts.id : opts.accessor
        opts.label = typeof opts.label === 'undefined' ? id : opts.label; // in case label not set in options, use the id

        var format = opts.format;
        var formGroup = inputHeader(selector, opts);
        var minValueReplace = opts.minValueReplace;
        var maxValueReplace = opts.maxValueReplace;
        var showValueReplace = opts.showValueReplace;

        formGroup.append('span')
            .attr('class','muted')
            .attr('id',id+'Val')
            .text(opts.format(opts.options.start));

        var slider = formGroup.append('div')
            .attr('id',id)
            .node()

        // generate slider
        var uiSlider = noUiSlider.create(slider, opts.options);
        var tabName = selector.replace('#','');
        var initValue = opts.options.start;
        if (!(tabName in _sliderValues)) _sliderValues[tabName] = {};

        // set initial value in title
        if (showValueReplace && (initValue == opts.options.range.min || initValue == opts.options.range.max)) {
            jQuery('#' + id + 'Val').text(initValue == opts.options.range.min ? minValueReplace : maxValueReplace); // update displayed value
        } else {
            jQuery('#' + id + 'Val').text(format(initValue)); // update displayed value
        }

        // initialize slider value store
        // need to refactor the code
        if (initValue.length == 2) {
            if (typeof minValueReplace !== 'undefined' && initValue[0] == opts.options.range.min) initValue[0] = minValueReplace;
            if (typeof maxValueReplace !== 'undefined' && initValue[1] == opts.options.range.max) initValue[1] = maxValueReplace;
        } else {
            if (typeof minValueReplace !== 'undefined' && initValue == opts.options.range.min) initValue = minValueReplace;
            if (typeof maxValueReplace !== 'undefined' && initValue == opts.options.range.max) initValue = maxValueReplace;
        }
        _sliderValues[tabName][id] = initValue;

        // add event listener for slider change
        uiSlider.on('slide', function(d) {
            var sliderVal = this.get();
            var sliderMin = this.options.range.min;
            var sliderMax = this.options.range.max;
            var tabName = jQuery('#' + id + 'Val').closest('.tab-pane').attr('id');

            // store slider values into gui global
            // replace the value with min/max ValueReplace if present
            var sliderValue;
            _sliderValues[tabName][id] = d.map(function(e, i) { 
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

            if (showValueReplace & (this.get() == sliderMin || this.get() == sliderMax)) {
                jQuery('#' + id + 'Val').text(this.get() == sliderMin ? minValueReplace : maxValueReplace); // update displayed value
            } else {
                jQuery('#' + id + 'Val').text(format(this.get())); // update displayed value
            }

            return sliderValue;
        });

        return slider;
    }


    /**
     * Add DOM header elements for each form input
     * including a bootstrap form-group with label
     */
    function inputHeader(selector, opts) {

        var formGroup = d3.select('#'+selector).append('div')
            .attr('class', 'form-group ' + opts.domClass)
            
        var span = formGroup.append('span')
            .attr('id',opts.accessor + 'Wrap')
        
        span.append('label')
            .attr('for',opts.accessor)
            .html(opts.label)

        // add popover
        if (typeof opts.help !== 'undefined') {


            if (!('container' in opts.help)) opts.help.container = 'div#'+selector; // constrain popover to GUI if not specified

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
     * on click event handler to reset all filters to 'default'
     * values - in this case default means the first option
     * for a select, and min/max values for sliders and empty
     * for text input.
     */
    function resetInputs(tabID, btnID) {

        // reset sliders and datetime pickers
        for (var col in colTypes) {
            var colType = colTypes[col];
            if (colType == 'int' || colType == 'float') {
                var slider = d3.select('#'+tabID).select('.noUi-target').node()
                if (slider) slider.noUiSlider.reset();
            } else if (colType == 'datetime' || colType == 'date') {
                jQuery('#'+col).data("DateTimePicker").date(moment(_unique[col][0]));
                jQuery('#'+col+'2').data("DateTimePicker").date(moment(_unique[col][_unique[col].length - 1]));
            }
        }

        // reset all selects
        jQuery('#' + tabID + ' select').each(function() {
            if (tabID == _facetsTab) { // facet selects get reset to first option
                jQuery(this).selectpicker('val', null);
            } else if (tabID == _filtersTab) { // filters selects get reset all seclected
                jQuery(this).selectpicker('selectAll');
            }
        });

        // reset button to read only and hide
        d3.select('#' + btnID)
            .attr('disabled','disabled')
            .style('display','none');


        return false;
    }

    /**
     * remove read-only from reset button and show it
     */
    function showButton(id) { jQuery('#'+id).attr('disabled',false).show(); }



    //============================================================
    // Expose
    //------------------------------------------------------------
    return this;
})
