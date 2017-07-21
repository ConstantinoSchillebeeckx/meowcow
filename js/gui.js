

var GUI = (function() {

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
    var container = false,  // DOM into which to render everything
        config = {},        // config details for plots
        data = {},          // data to plot
        colTypes = {},      // overwrite column types with these
        formSubmit,         // form submit function for render
        unique = []         // columns to ignore in data


    //============================================================
    // Private variables
    //------------------------------------------------------------
    var _guiID = 'guiBody',          // ID to give to gui body
        _warningsID = 'warnings',    // ID to give to warnings DOM
        _renderBtnID = 'renderBtn',  // ID for render button
        _plotTypesID = 'plotTypes',  // ID for plot types tab
        _setupTab = 'plotSetup',     // ID for plot setup tab
        _facetsTab = 'plotFacets',   // ID for plot facets tab
        _optionsTab = 'plotOptions', // ID for plot options tab
        _filtersTab = 'plotFilter',  // ID for plot filters tab
        _facetResetBtn = 'facetsBtn',
        _filtersResetBtn = 'filtersBtn',
        _sliderValues = {} // keeps track of all current slider values {tabName: {sliderName: val}, ...}

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
        if (d) { data = d; return this; }
        return data; 
    }
    this.unique = function(d) {
        if (d) { unique = d; return this; }
        return unique; 
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
        buildContainers();
        populateGUI();
    }



    //============================================================
    // Private functions
    //------------------------------------------------------------    

    // NEXT: think about how to parse setup and access those
    // settings more easily e.g. defined plot types
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

    var getPlotConfig = function() { return config.plotTypes[getPlotType()]; }; // get config for currently selected plot
    var getPlotOptions = function(plotType) { return getPlotConfig().options; }; // get options for current plot
    var getPlotType = function() { return jQuery('#'+_plotTypesID).val(); }; // get currently selected plot type
    var getAxisSetup = function(axis) { return getPlotConfig().setup[axis]; };
    var getAllowFacets = function() { return 'allowFacets' in getPlotConfig() ? getPlotConfig().allowFacets : true; }; // bool for whether facets allowed, default true
    var getAvailableAxes = function() { 
        var plotType = getPlotType() || Object.keys(config.plotTypes)[0];
        return Object.keys(config.plotTypes[plotType].setup); 
    }; // get axes in config for plot

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
    var getColsByType = function(type) { // return colTypes keys that match the given type [interval/ordinal]
        if (typeof type !== 'undefined') {
            var filter = type == 'interval' ? ['int','float'] : ['datetime','str'];
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
        if (typeof unique !== 'undefined') {

            // add tab and container
            var note = 'Use the inputs below to filter the plotted data.';
            note += '<br><span class="label label-default">NOTE</span> ';
            note += 'each additional filter is combined as an <code>and</code> boolean operation.';
            addTab(_filtersTab, 'Filters', note);



            // generate an input for each of the columns in the loaded dataset
            for (var col in colTypes) {
                var colType = colTypes[col]
                var colVals = unique[col];

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
                    slider = generateFormSlider(_filtersTab, opts);
                    slider.noUiSlider.on('start',function() { showButton(_filtersResetBtn) }); // activate reset button

                } else if (colType == 'str') { // if categorical, render a select
                    var opts = {
                        values:colVals, 
                        accessor:col+'Filter', 
                        label:col, 
                        domClass:'col-sm-4 filterInput', 
                        attributes:{
                            multiple:true,
                            'data-actions-box':true
                        },
                        selectAll: true
                    };
                    select = generateFormSelect(_filtersTab, opts);
                    select.on('change',function() { showButton(_filtersResetBtn) }); // activate reset button
                } else if (colType == 'datetime') {
                    var opts = {values:colVals, accessor:col, label:col, type:colType, range:true, domClass:'col-sm-8'};
                    generateDateTimeInput(_filtersTab, opts);
                    jQuery('#'+col+'DateTime').on('dp.change', function() { showButton(_filtersResetBtn)})
                    if (opts.range) jQuery('#'+col+'2DateTime').on('dp.change', function() { showButton(_filtersResetBtn)})
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


            ['horizontal','vertical'].forEach(function(d) {
                var cols = getColsByType('ordinal');
                var select = generateFormSelect(_facetsTab, {values:cols, accessor:d+'-facet', label:(d == 'horizontal') ? 'Columns' : 'Rows', addOption:{'None':''}});
                select.on('change',function() { showButton(_facetResetBtn) }); // activate reset button
            });

            var input = generateFormTextInput(_facetsTab, {accessor:'colWrap', label:'Column wrap', type:'number'});
            input.on('change',function() { showButton(_facetResetBtn) }); // activate reset button

            // filter reset button
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
                .text('Reset filters');
        } else {
            d3.select(_facetsTab).style('display','hidden');
        }
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

        // clear out form input in case there was a plotType change
        d3.selectAll('#'+_setupTab+' .form-group').filter(function(d,i) { return i > 0}).remove(); // remove all but first select

        if (availableAxes) {
            availableAxes.forEach(function(d) {
                var axisSetup = getAxisSetup(d);
                if ('type' in axisSetup) {
                    var cols = getColsByType(axisSetup.type);
                    var label = "label" in axisSetup ? axisSetup.label : d.toUpperCase()+"-axis";
                    var domClass = d == 'z' ? 'col-sm-4 col-sm-offset-4' : 'col-sm-4';
                    generateFormSelect(_setupTab, {values:cols, accessor:d +"-axis", label:label, domClass:domClass, addOption:axisSetup.addOption});
                }
            });
        }
    }


    /**
     * Parse setup and generate the remaining
     * tabs and content by calling plotTypeChange();
     */
    function populateGUI() {

        var note = 'Choose the type of plot to be rendered along with the proper data for each axis.';
        addTab(_setupTab, 'Setup', note, true);

        var select = generateFormSelect(_setupTab, {values:getPlotTypes(), accessor:_plotTypesID, label:"Plot type"})
        select.on('change', plotTypeChange);

        makeSetupTab();
        makeFacetsTab();
        makeOptionsTab();
        makeFiltersTab();
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
            console.log(col, colCount)
            
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
     * @param {str} text - label text for tab
     * @param {str} note - descriptive text explaining tab
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
            .text(text)

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
     * - a bootstrap row (#guiRow) that is set as a full width column
     * - a bootstrap row (#warningsRow)
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
        var sel = d3.select(container);

        var guiRow = sel.append("div")
            .attr("class","row")
            .attr("id","guiRow");
        var guiCol = guiRow.append("div")
            .attr("class","col-sm-12");

        var warningsRow = sel.append("div")
            .attr("class","row")
            .attr("id","warningsRow");
        var warningsCol = warningsRow.append("div")
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
            .on('click', formSubmit);
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
     * @key {str} type - type of picker, 'datetime' or 'XXX' TODO
     */
    function generateDateTimeInput(selector, opts) {
        if (typeof opts.addOption === 'undefined') opts.addOption = false;
        if (typeof opts.domClass === 'undefined' || opts.domClass == false) opts.domClass = 'col-sm-4';
        var id = opts.accessor
        opts.label = typeof opts.label === 'undefined' ? id : opts.label; // in case label not set in options, use the id

        // default picker options
        var pickerOptions = 'options' in opts ? opts.options : {};
        pickerOptions.showTodayButton = true;
        pickerOptions.format = opts.type == 'datetime' ? "YYYY-MM-DD h:mm:ss a" : "YYYY-MM-DD";

        var formGroup = inputHeader(selector, opts);

        // generate another row within formgroup
        // so we can easily dimension one/two pickers
        var pickerRow = formGroup.append('div')
            .attr('class','row')
            
        var pickerCol = pickerRow.append('div')
            .attr('class', function() { return 'datetimepickers ' + (opts.range ? ' col-sm-6' : ' col-sm-12');});

        var pickerDT = buildDateTimePicker(pickerCol, id);
        var picker1 = '#'+id+'DateTime';

        jQuery(picker1).datetimepicker(pickerOptions); // activate

        // if date range required, add second picker
        if (opts.range === true) {

            var pickerCol = pickerRow.append('div')
                .attr('class','col-sm-6 datetimepickers')

            var pickerDT2 = buildDateTimePicker(pickerCol, id+'2');
            var picker2 = '#'+id+'2DateTime';
            jQuery(picker2).datetimepicker(pickerOptions); // activate

            jQuery(picker2).datetimepicker({
                useCurrent: false //Important! See issue #1075
            });
            jQuery(picker1).on("dp.change", function (e) {
                jQuery(picker2).data("DateTimePicker").minDate(e.date);
                // TODO if current picker2 date is less than picker1, change picker2 date to picker1
            });
            jQuery(picker2).on("dp.change", function (e) {
                jQuery(picker1).data("DateTimePicker").maxDate(e.date);
                // TODO if current picker1 date is greater than picker2, change picker1 date to picker2
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
     *   (e.g. 'setupTab')
     * @param {obj} opts - options for select, can contain the following keys:
     * @key {array/obj}  values - list of options to populate select with. If an
     *   array is passed, both the select value and text will be the set with the
     *   array elements; if an object is passed keys will be the option label and
     *   obj values will be the option value.
     * @key {string} accessor - id/name to give to select
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
        var id = opts.accessor
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
     * Generate a bootstrap toggle input
     *
     * @param {string} selector - element to which to add form-group (label and select)
     *   (e.g. 'setupTab')
     * @param {obj} opts - options for select, can contain the following keys:
     * @key {string} accessor - id/name to give to toggle
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
        if (!(tabName in _sliderValues)) _sliderValues[tabName] = {};

        // initialize slider value store
        var initValue = opts.options.start;
        if (initValue.length == 2) {
            if (typeof minValueReplace !== 'undefined' && initValue[0] == opts.options.range.min) initValue[0] = minValueReplace;
            if (typeof maxValueReplace !== 'undefined' && initValue[1] == opts.options.range.max) initValue[1] = maxValueReplace;
        } else {
            if (typeof minValueReplace !== 'undefined' && initValue == opts.options.range.min) initValue = minValueReplace;
            if (typeof maxValueReplace !== 'undefined' && initValue == opts.options.range.max) initValue = maxValueReplace;
        }
        _sliderValues[tabName][id] = initValue;

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
                var slider = d3.select('#'+tabID).select('#'+col+'FilterSliderWrap').node()
                if (slider) {
                    var colVals = d3.extent(unique[col]);
                    slider.noUiSlider.set(colVals); // TODO use this.options.start instead
                }
            } else if (colType == 'datetime') {
                jQuery('#'+col+'DateTime').data("DateTimePicker").date(moment(unique[col][0])); // TODO - reset all present pickers; set to initialized date (should probably store this somewhere)
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


    //============================================================
    // Expose
    //------------------------------------------------------------
    return this;
})
