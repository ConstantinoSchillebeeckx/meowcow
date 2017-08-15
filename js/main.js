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
        ignoreCol = false   // columns to ignore in data


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
        _facetRows,
        _facetCols,
        _facetVals,
        _hVal,
        _vVal,
        _warningsID = 'warnings',
        _aspectRatio = 2.0; // width to height ratio of facets
    


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

        // clear any previously existent plots/warnings
        // plots are only cleared if the GUI options for facets are changed
        // of if the filtering is changed
        if (_gui.facetOptionsHaveChanged() || _gui.filterOptionsHaveChanged()) { 

            if (_gui.facetOptionsHaveChanged()) jQuery(canvas).empty();  // clear out facets if facet options changed
            _facets = setupFacetGrid(guiVals, _gui.data());


            // generate facets and group data
            _facetRows = Object.keys(_facets);
            _facetCols = Object.keys(_facets[_facetRows[0]]);

            _facetVals = guiVals.plotFacets;
            _hVal = getFacetCol(guiVals)
            _vVal = getFacetRow(guiVals);

        }
        jQuery('#' + _warningsID).empty();


        // draw plot in each facet
        var chartCount = 0;
        _facetRows.forEach(function(rowName,i) {
            _facetCols.forEach(function(colName,j) {

                var facetDat = _facets[rowName][colName];

                if (typeof facetDat !== 'undefined') {

                    var title = null;
                    if (_facetVals.facetOn) {
                        if (_hVal && _vVal) {
                            title = _vVal + ' = ' + rowName + ' | ' + _hVal + ' = ' + colName;
                        } else if (_hVal || _vVal) {
                            title = _vVal ? _vVal + ' = ' + rowName : _hVal + ' = ' + colName;    
                        }
                    }

                    // draw plot
                    populateChart(facetDat, '#facet_'+chartCount, guiVals, title, chartCount);
                }
                chartCount += 1;
            });

            // update list of columns for new row
            if (_facetRows.length > 1 && (i+1) < _facetRows.length) _facetCols = Object.keys(_facets[_facetRows[i+1]]);
        })

        
        jQuery('#'+_renderBtn).html('Update').prop('disabled', false); // TODO wait until everything finishes rendering ... async!
        //  chart.dispatch.on('renderEnd', function() {} ...
    }




    /**
     * Once all GUI options and data are set, we can
     * render the plot.
     *
     * @param {obj} dat - data for each facet
     * @param {string} sel - selector for facet into which to render plot
     * @param {obj} formVals - GUI option values
     * @param {string} title - [optional] title for plot, should be null if no title
     * @param {int} chartCount - chart facet number to update/plot, is used to updated
     *   the _chartArray plot store.
     *
     * @return void
     */
    function populateChart(dat, sel, formVals, title, chartCount) {

        var plotType = formVals.plotSetup.plotTypes;
        var plotOptions = config.plotTypes[plotType]; // lookup options for selected plot type

        // nvd3 expects SVG to exist already
        d3.select(sel + ' svg');

        // parse data if needed before plotting
        var datReady = dat;
        var parseFunc = plotOptions.parseData;
        if (typeof parseFunc === "function") {
            datReady = parseFunc(dat);
        }

        // create the chart
        var chart;
        var chartUpdate = false; // whether the chart should be updated
        nv.addGraph(function() {
            console.log('Rendering ' + plotType);

            // load previous chart if it exists
            if (typeof _chartArray[chartCount] !== 'undefined' && !_gui.facetOptionsHaveChanged()) {
                chart = _chartArray[chartCount];
                chartUpdate = true;
                console.log('loading previous chart')
            } else {
                chart = nv.models[plotType]();
            }

            // setup data accessors for each axis
            // we will need the name of the accessor function to be called on the chart
            // as well as the actual accessor function (which is defined by the GUI)
            var optsSet = {};
            Object.keys(plotOptions.axes).forEach(function(axis) {
                var d = plotOptions.axes[axis];
                var accessorName = d.accessor;
                var accessorAttr = formVals.plotSetup[d.accessor]; // get the GUI value for the given chart axis option
                if (accessorName) {
                    optsSet[accessorName] = accessorAttr;
                    if (accessorAttr) {
                        chart[accessorName](function(e) { return e[accessorAttr] });
                    } else {
                        chart[accessorName](accessorAttr);
                    }
                }
            });

            // set chart options
            if ('options' in plotOptions) {
                plotOptions.options.forEach(function(d) {
                    var optionName = d.accessor;
                    var optionValue = formVals.plotOptions[optionName]; // get the GUI value for the given chart options

                    // if GUI option was an array (for a single handle slider) grab the only element
                    if (Array.isArray(optionValue) && optionValue.length === 1) optionValue = optionValue[0];

                    // if GUI option was a select input type, data comes in as an object, grab just the values
                    if (typeof optionValue === 'object' && optionValue != null) optionValue = optionValue.value;

                    // convert bool string into bool
                    optionValue = optionValue === "true" ? true : optionValue === "false" ? false : optionValue;

                    chart[optionName](optionValue)
                    optsSet[optionName] = optionValue;
                })
            }
            console.log(optsSet)

            // set title
            //if (title !== null && title) chart.title(title); // need to ensure all chart types have the title option

            //formatAxisTitle(chart, guiVals);
            //formatTooltip(chart, guiVals);
            var datum = d3.select(sel + ' svg')
                            .datum(datReady)
            console.log(datReady)

            // adjust height of all rows if min row height has changed
            var rowHeight = getFacetMinHeight(formVals); // will be false if slider set to 'Auto'
            if (rowHeight != getFacetCurrentHeight() && rowHeight) {
                jQuery('.facet').animate({'height': rowHeight}, 150);
                chart.height(rowHeight);
            } else if (!rowHeight && getFacetAutoHeight() != getFacetCurrentHeight()) { // update height to auto
                jQuery('.facet').animate({'height': getFacetAutoHeight()}, 150);
                chart.height(getFacetAutoHeight());
            }

            if (chartUpdate) {
                chart.update();
            } else {
                datum.call(chart);
            }

            nv.utils.windowResize(function() { chart.update; } ); // TODO update facet col widths on window resize
            _chartArray[chartCount] = chart;

            return chart;
        });
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
        var numRows = rowDat.length;
        var numCols = colDat.length;
        var plotDom = d3.select('#' + _canvasWrap);
        var facetVals = guiVals.plotFacets;
        var minRowHeight = getFacetMinHeight(guiVals);

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

            numRows = (colWrap) ? Math.ceil(colDat.length / colWrap) : rowDat.length;
            numCols = (colWrap) ? colWrap : colDat.length;
        }

        // calculate width/height of each facet 
        var colWidth = jQuery('#guiPanel').width() / numCols;
        var rowHeight = typeof minRowHeight === 'number' ? minRowHeight : colWidth / _aspectRatio;

        // generate DOM elements
        var facetCount = 0;
        var plotCount = 1;
        for (var i = 0; i < numRows; i++) {

            if (d3.select('#row_'+i).empty()) { // dont generate row if it already exists
                var row = plotDom.append('div')
                    .attr('class', 'facetRow')
                    .attr('id', 'row_' + i);

                if (d3.select('#facet_'+facetCount).empty()) {
                    for (var j = 0; j < numCols; j++) {
                        row.append('div')
                            .attr('class', facetCount%2==0 ? 'facet fill' : 'facet')
                            .attr('id','facet_'+facetCount)
                            .style({height: rowHeight + 'px', width: colWidth + 'px'})
                            .append('svg')
                            //.attr('id','plot_'+plotCount);
                        facetCount++;

                        plotCount += 1;
                    }
                }
            }

            // this will prevent the final row from filling with facets
            if (colWrap && i == (numRows - 2) ) numCols = (colDat.length % colWrap) ? colDat.length % colWrap : colWrap; 

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

    var convert = str * 1;

    return (isNaN(convert)) ? str : convert;

}
