var meowcow = (function() {

    
    //============================================================
    // Semantics
    //------------------------------------------------------------
    /*
     column - a data set is made up of columns (or variables) that
              define variable attributes for observations (rows)
     */

    //============================================================
    // Public Variables with Default Settings
    //------------------------------------------------------------
    var container = false,  // DOM into which to render everything
        config = {},        // config details for plots
        data = false,       // data to plot
        colTypes = {},      // overwrite column types with these
        ignoreCol = []   // columns to ignore in data


    //============================================================
    // Private variables
    //------------------------------------------------------------
    var _gui,                   // gui class object
        _guiWrap='gui',         // ID for GUI DOM
        _canvasWrap='canvas',   // ID for plot DOM
        _renderBtn='renderBtn', // ID for GUI render button
        _chartArray=[],         // contains any renderd NVD3 chart objects
        _minRowHeight = 'minRowHeight',  // facet min row height slider ID
        _facets,
        _facetVals,
        _hVal,
        _vVal,
        _numRows,   // number of facet rows
        _numCols,   // number of facet columns
        _warningsID = 'warnings',
        _guiPanelID = 'guiPanel',
        _aspectRatio = 2.0; // width to height ratio of facets
        _optsSet = {}; // settings chosen in Setup tab, used as a cache
        _facetDat = []; // array of datasets for each facet
        _legendOffset = 20; // how much to offset title when a legend is present
    


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
    this.ignoreCol = function(d) {
        if (d) { ignoreCol = d; return this; }
        return ignoreCol; 
    }
    this.colTypes = function(d) {
        if (d) { colTypes = d; return this; }
        return colTypes; 
    }
    this.charts = function() {
        return _chartArray;
    }
    this.run = function() {

        // build DOM wraps for GUI and plot area
        if (jQuery('#'+_guiWrap).length == 0) d3.select(container).append('div').attr('id',_guiWrap).attr('class','row')
        if (jQuery('#'+_canvasWrap).length == 0) d3.select(container).append('div').attr('id',_canvasWrap)


        // build gui
        _gui = GUI()
            .container('#'+_guiWrap)
            .config(config)
            .data(data)
            .colTypes(colTypes)
            .ignoreCol(ignoreCol)
            .formSubmit(renderPlot)
            .init();
  
        return this; 
    }



    //============================================================
    // Private functions
    //------------------------------------------------------------    

    var getFacetRow = function(d) { return d.plotFacets['row-facet']; }
    var getFacetCol = function(d) { return d.plotFacets['col-facet']; }
    var getFacetMinHeight = function(d) { return d.plotFacets[_minRowHeight] == 'Auto' ? false : d.plotFacets[_minRowHeight][0]; }
    var getFacetAutoHeight = function() { return jQuery('#facet_0').width() / _aspectRatio };
    var getFacetCurrentHeight = function() { return jQuery('#facet_0').height(); };
    var calcColWidth = function() { return jQuery('#' + _guiPanelID).width() / _numCols };
    var updateColWidth = function() { jQuery('.facet').css('width',calcColWidth()); }
    var marginTop = function(d) { return d.plotFlourish.marginTop[0]; }
    var marginBottom = function(d) { return d.plotFlourish.marginBottom[0]; }
    var marginLeft = function(d) { return d.plotFlourish.marginLeft[0]; }
    var marginRight = function(d) { return d.plotFlourish.marginRight[0]; }
    var getPlotOptions = function(d) { return config.plotTypes[d.plotSetup.plotTypes]; }
    var getPlotType = function(d) { return d.plotSetup.plotTypes; }
    var inDevelopment = function(d) { return 'inDevelopment' in getPlotOptions(d); }


     /**
     * on click event handler for 'Render' button. will check all the user set
     * GUI values and ensure plots can be rendered. will also remove any current
     * plots if needed (only when facet options are changed). finally, will also
     * setup all the proper facets if needed and then render the plot in the facet.
     *
     *
     * @return void
    */
    function renderPlot() {

        // change render button to spinner
        jQuery('#'+_renderBtn).html('<i class="fa fa-spinner fa-spin"></i>').prop('disabled', true);
        //jQuery('.collapse').collapse() // collapse GUI

        var guiVals = _gui.getGUIvals();
        var title = guiVals.plotFlourish.chartTitle;

        // clear any previously existent plots/warnings
        // plots are only cleared if the GUI options for facets are changed
        // of if the filtering is changed
        if (_gui.facetOptionsHaveChanged() || _gui.filterOptionsHaveChanged() || _gui.plotTypeHasChanged()) { 

            jQuery(canvas).empty(); 
            _facets = setupFacetGrid(guiVals, _gui.data());
            _facetVals = guiVals.plotFacets;
            _hVal = getFacetCol(guiVals)
            _vVal = getFacetRow(guiVals);

        }
        
        // show development warning if needed,
        // otherwise clear out all warnings
        if (inDevelopment(guiVals)) {
            displayWarning("This chart type is currently in development, all features may not work correctly", _warningsID, false);
        } else {
            jQuery('#' + _warningsID).empty();
        }

        // draw plot in each facet
        var chartCount = 0;
        for (let i=0; i<_numRows; i++) {
            for (let j=0; j<_numCols; j++) {

                var rowName = Object.keys(_facets)[i];
                var colName = Object.keys(_facets[rowName])[j];
                var dat = _facets[rowName][colName];

                // parse data if needed before plotting
                var parseFunc = getPlotOptions(guiVals).parseData;
                if (typeof parseFunc === "function") {
                    dat = parseFunc(dat); 
                }

                if (typeof dat !== 'undefined') {

                    if (_facetVals.facetOn) {
                        if (_hVal && _vVal) {
                            title = _vVal + ' = ' + rowName + ' | ' + _hVal + ' = ' + colName;
                        } else if (_hVal || _vVal) {
                            title = _vVal ? _vVal + ' = ' + rowName : _hVal + ' = ' + colName;    
                        }
                    }

                    // draw plot
                    populateChart(dat, '#facet_'+chartCount, guiVals, title, chartCount);
                    chartCount += 1;
                }
            }

        }

        
        jQuery('#'+_renderBtn).html('Update').prop('disabled', false); // TODO wait until everything finishes rendering ... async!
        //  chart.dispatch.on('renderEnd', function() {} ...
    }




    /**
     * Once all GUI options and data are set, we can
     * render the plot.
     *
     * @param {obj} dat - data for each facet
     * @param {string} sel - id for facet into which to render plot
     * @param {obj} formVals - GUI option values
     * @param {string} title - [optional] title for plot, should be null if no title
     * @param {int} chartCount - chart facet number to update/plot, is used to update
     *   the _chartArray plot store.
     *
     * @return void
     */
    function populateChart(dat, sel, formVals, title, chartCount) {

        var plotType = getPlotType(formVals);
        var plotOptions = getPlotOptions(formVals); // lookup options for selected plot type

        // nvd3 expects SVG to exist already
        var svg = d3.select(sel + ' svg');

        // create the chart
        var chart;
        var chartUpdate = false; // whether the chart should be updated
        nv.addGraph(function() {
    
            // load previous chart if:
            // - it exists (and)
            // - facet options have not changed (and)
            // - plot type has not changed
            if (typeof _chartArray[chartCount] !== 'undefined' && !_gui.facetOptionsHaveChanged() && !_gui.plotTypeHasChanged()) {
                chart = _chartArray[chartCount];
                chartUpdate = true;
                console.log('Updating ' + plotType + ' #' + chartCount);
            } else {
                console.log('Rendering ' + plotType + ' #' + chartCount);
                chart = nv.models[plotType]();
            }

            // setup data accessors for each axis
            // we will need the name of the accessor function to be called on the chart
            // as well as the actual accessor function (which is defined by the GUI)
            Object.keys(plotOptions.axes).every(function(axis) {
                var d = plotOptions.axes[axis];
                var accessorName = d.accessor;
                var accessorAttr = formVals.plotSetup[d.accessor]; // get the GUI value for the given chart axis option
                var skipCheck = ('skipCheck' in d && d.skipCheck) ? true : false;

                if (!skipCheck) {

                    // ensure option from config is valid
                    if (!checkIfIsOption(chart[accessorName], accessorName, plotType)) {
                        d3.select(sel).remove()
                        return false;
                    }

                    if ((accessorName && !chartUpdate) || accessorAttr !== _optsSet[chartCount][accessorName]) {
                        console.log(chart[accessorName], accessorAttr)
                        if (accessorAttr) {
                            chart[accessorName](function(e) { return e[accessorAttr] });
                        } else {
                            chart[accessorName](accessorAttr);
                        }
                        if (!(chartCount in _optsSet)) _optsSet[chartCount] = {}

                        _optsSet[chartCount][accessorName] = accessorAttr
                    }

                }

                return true; // since we're looping with a [].every()
            });

            // set chart options
            if ('options' in plotOptions) {
                plotOptions.options.every(function(d) {
                    var optionName = d.accessor;
                    var optionValue = formVals.plotOptions[optionName]; // get the GUI value for the given chart options

                    if (!checkIfIsOption(chart[optionName], optionName, plotType)) {
                        d3.select(sel).remove()
                        return false;
                    }

                    // if GUI option was an array (for a single handle slider) grab the only element
                    if (Array.isArray(optionValue) && optionValue.length === 1) optionValue = optionValue[0];

                    // if GUI option was a select input type, data comes in as an object, grab just the values
                    if (typeof optionValue === 'object' && optionValue != null) optionValue = optionValue.value;

                    // convert bool string into bool
                    optionValue = optionValue === "true" ? true : optionValue === "false" ? false : optionValue;

                    if (!chartUpdate || optionValue !== chart[optionName]()) { // only update those options that have changed
                        chart[optionName](optionValue)
                    }

                    return true; // since we're looping with a [].every()
                })
            }


            // set margin
            var titleFontSize = 15;
            var margin = {
                top: marginTop(formVals),
                //top: (title && marginTop(formVals) < titleFontSize * 2) ? titleFontSize * 2 : marginTop(formVals), 
                right: marginRight(formVals), 
                bottom: (marginBottom(formVals) < 60 && formVals.plotSetup.xLabel) ? 60 : marginBottom(formVals), 
                left: (marginLeft(formVals) < 100 && formVals.plotSetup.yLabel) ? 100 : marginLeft(formVals), 
            };
            chart.margin(margin);

            // TODO if automatically adding margin space due to axis labels, 
            // update the GUI slider

            console.log(formVals)

            // adjust height of all rows if min row height has changed
            // will be false if slider set to 'Auto'
            var rowHeight = getFacetMinHeight(formVals); 

            if (rowHeight != getFacetCurrentHeight() && rowHeight) {
                jQuery('.facet').animate({'height': rowHeight}, 150);
                chart.height(rowHeight);
            } else if (!rowHeight && getFacetAutoHeight() != getFacetCurrentHeight()) { 
                // update height to auto
                jQuery('.facet').animate({'height': getFacetAutoHeight()}, 150);
                chart.height(getFacetAutoHeight());
            }

            // set axis labels
            formatAxisLabels(chart, _gui.colTypes(), formVals);

            // set title
            formatChartTitle(svg, title, titleFontSize, formVals); 

            svg.datum(dat) // rebind data in case it changed

            if (chartUpdate) {
                chart.update();
            } else {
                svg.call(chart);
            }

            nv.utils.windowResize(function() { updateColWidth(); chart.update; } ); 
            // TODO update facet col widths on window resize
            _chartArray[chartCount] = chart;

        });
       
        return chart;
    }


    /**
     * Add a DOM element within the chart SVG
     * which acts as a chart title; it will 
     * be centered on the chart
     *
     * @param {string} sel - chart svg selection
     * @param {str} title - title to append to chart
     * @param {int, optional} fontSize - font size to style title with
     *        if not provided, will be calculatd automatically based
     *        on the facet width
     * @param {obj} formVals - GUI option values
     *
     * @return void
     */
    function formatChartTitle(svg, title, fontSize, formVals) {

        // remove previous title if updating text
        if (svg.select('.chartTitle').empty() === false) svg.select('.chartTitle').remove();
   
        if (title && (svg.select('.chartTitle').empty() || svg.select('.chartTitle text').text() !== title)) {

            if (typeof fontSize === 'undefined') fontSize = d3.min([jQuery(sel).width() * 0.07, 20]); // for title

            //var facetWidth = jQuery(sel).width();
            var facetWidth = svg.node().parentNode.getBoundingClientRect().width

            svg.append('g')
                .attr('class','chartTitle')
                .attr('transform', function(d) { return 'translate('+ facetWidth/2 +','+ fontSize + ')'; })
                .append('text')
                .style('text-anchor','middle')
                .style('font-size', fontSize + 'px')
                .text(title);
        }
    }


    /*
     * Add axis title and format tick labels based on
     * field type.
     *
     * @param {obj} chart - nvd3 chart object
     * @param {obj} colTypes - column type of each column
     *              of the input data. e.g. float, str
     * @param {str} x - label for x-axis
     * @param {str} y - label for y-axis
     * @param {int} fontSize - font size for axis ticks, default 10
     *
     * @return void
     */

    function formatAxisLabels(chart, colTypes, guiVals, fontSize) {

        var x = guiVals.plotSetup.x;
        var y = guiVals.plotSetup.y;

        if (typeof fontSize === 'undefined') fontSize = 10;

        if (colTypes[x] === 'float') {
            var digits = guiVals.plotFlourish.xDigits != null ? guiVals.plotFlourish.xDigits : 2; // default to 2 digits
            chart.xAxis.tickFormat(d3.format('.' + digits + 'f'));
        }
        chart.showXAxis(true);
        chart.xAxis
            .axisLabel(guiVals.plotFlourish.xLabel != null ? guiVals.plotFlourish.xLabel : x)
            .fontSize(fontSize);

        if (colTypes[y] === 'float') {
            var digits = guiVals.plotFlourish.yDigits != null ? guiVals.plotFlourish.yDigits : 2; // default to 2 digits
            chart.yAxis.tickFormat(d3.format('.' + digits + 'f'));
        }
        chart.showYAxis(true);
        chart.yAxis
            .axisLabel(guiVals.plotFlourish.yLabel != null ? guiVals.plotFlourish.yLabel : y)
            .fontSize(fontSize);

    }




    /**
     * Generate the proper facet grid setup based on GUI options
     * and group data, including the svg in which the plot is
     * rendered.
     *
     * Will generate the proper number of rows as well as columns
     * within those rows; each of these facets will house a plot.
     *
     * Each row is setup as a boostrap row with an additional
     * 'facetRow' class; each column has a 'facet' class.
     *
     * @param {obj} guiVals - return from getGUIvals()
     * @param {obj} dat - return from convertToJSON()
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
    function setupFacetGrid(guiVals, dat) {


        var colDat, colWrap, plotDom;
        var rowDat = ['row0'];
        var colDat = ['col0'];
        _numRows = rowDat.length;
        _numCols = colDat.length;
        var plotDom = d3.select('#' + _canvasWrap);
        var facetVals = guiVals.plotFacets;
        var minRowHeight = getFacetMinHeight(guiVals);
        _chartArray = []; // reset in case data gets filtered

        if (facetVals.facetOn) {  // if plotting with facets
            var hVal = getFacetCol(guiVals);
            var vVal = getFacetRow(guiVals);
            if (vVal) { // if row facet specified
                rowDat = vVal in guiVals.plotFilter ? guiVals.plotFilter[vVal] : _gui.unique()[vVal];
            }
            if (hVal) { // if col facet specified
                colDat = hVal in guiVals.plotFilter ? guiVals.plotFilter[hVal] : _gui.unique()[hVal];
            }
            colWrap = (facetVals.colWrap) ? convertToNumber(facetVals.colWrap) : false;

            _numRows = (colWrap) ? Math.ceil(colDat.length / colWrap) : rowDat.length;
            _numCols = (colWrap) ? colWrap : colDat.length;
        }

        // calculate width/height of each facet 
        var colWidth = calcColWidth();
        var rowHeight = typeof minRowHeight === 'number' ? minRowHeight : colWidth / _aspectRatio;

        // generate DOM elements
        var facetCount = 0;
        var plotCount = 1;
        for (var i = 0; i < _numRows; i++) {

            if (d3.select('#row_'+i).empty()) { // dont generate row if it already exists
                var row = plotDom.append('div')
                    .attr('class', 'facetRow')
                    .attr('id', 'row_' + i);

                if (d3.select('#facet_'+facetCount).empty()) {
                    for (var j = 0; j < _numCols; j++) {
                        row.append('div')
                            .attr('class', 'facet ' + (facetCount%2==0 ? 'fill' : ''))
                            .attr('id','facet_'+facetCount)
                            .style({height: rowHeight + 'px', width: colWidth + 'px'})
                            .append('svg')
                        facetCount++;

                        plotCount += 1;
                    }
                }
            }

            // this will prevent the final row from filling with facets
            if (colWrap && i == (_numRows - 2) ) _numCols = (colDat.length % colWrap) ? colDat.length % colWrap : colWrap; 

        }


        // group the data
        // first group by row, then by column
        // into form {row_groups: {col_groups: {dat} } }
        // if row & col combination of data is missing, undefined will be the val
        if (vVal && hVal) {
            var nested = d3.nest()
                .key(function(d) { return d[vVal] })
                .key(function(d) { return d[hVal] })
                .map(dat);

            // set undefined for missing data
            for (var i = 0; i < rowDat.length; i++) {
                if (!(rowDat[i] in nested)) nested[rowDat[i]] = {};
                for (var j = 0; j < colDat.length; j++) {
                    if (!(colDat[j] in nested[rowDat[i]])) nested[rowDat[i]][colDat[j]] = undefined;
                }
            }

        } else if (vVal || hVal) {
            var tmp = d3.nest()
                .key(function(d) { return (vVal) ? d[vVal] : d[hVal] })
                .map(dat);

            var nested = {};
            if (vVal) { // if grouping in rows
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
     * Used to check whether a particular option set
     * in config.js is valid for the given plot. If
     * not, an error message is displayed.
     *
     * @param {} 
     * @param {str} option - option name
     * @param {str} chartType - chart type being checked for option 
     *
     * @return - false if option is not valid
     */
    function checkIfIsOption(func, option, chartType) {

        if (typeof func !== "function") {
            displayWarning("The chart option <code>" + option + "</code> does not exist for the chart " + chartType + "; please change it in your config.", _warningsID, true);
            return false;
        }
        return true;
    }

    //============================================================
    // Expose
    //------------------------------------------------------------
    return this;

});



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
        d3.select("body").append("div").attr("id",_warningsID)
        selector = "#" + _warningsID;
    }


    if (error) {
        var tmp = '<div class="alert alert-danger alert-dismissible" role="alert">';
    } else {
        var tmp = '<div class="alert alert-warning alert-dismissible" role="alert">';
    }
    tmp += '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>';
    tmp += message;
    tmp += '</div>';
    d3.select('#'+selector).html(tmp);
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

    if (str != null) {
        var convert = str * 1;

        return (isNaN(convert)) ? str : convert;
    } else {
        return str;
    }

}

