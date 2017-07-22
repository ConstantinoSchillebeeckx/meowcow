/*
TODO
- gui rules set by config file (e.g. some charts could allow x-axis to be the same as the y-axis)
- data filtering
- min row height
*/

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
        data = {},          // data to plot
        colTypes = {},      // overwrite column types with these
        ignoreCol = false   // columns to ignore in data


    //============================================================
    // Private variables
    //------------------------------------------------------------
    var _colTypes,            // automatically detected column types
        _unique,              // obj of unique values for each column
        _gui,                 // gui class object
        _guiWrap='gui',       // ID for GUI DOM
        _canvasWrap='canvas'  // ID for plot DOM
    


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
    this.run = function() {

        // build DOM wraps for GUI and plot area
        if (jQuery('#'+_guiWrap).length == 0) d3.select(container).append('div').attr('id',_guiWrap).attr('class','row')
        if (jQuery('#'+_canvasWrap).length == 0) d3.select(container).append('div').attr('id',_canvasWrap)

        // prep data
        _colTypes = findColumnTypes(data,ignoreCol,colTypes);
        _unique = getAllUnique(data, _colTypes);

        // build gui
        _gui = GUI()
            .container('#'+_guiWrap)
            .data(data)
            .config(config)
            .colTypes(_colTypes)
            .unique(_unique)
            .formSubmit(renderPlot)
            .init();
   
    }



    //============================================================
    // Private functions
    //------------------------------------------------------------    

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
        jQuery('#renderBtn').html('<i class="fa fa-spinner fa-spin"></i>').prop('disabled', true);
        jQuery('.collapse').collapse() // collapse GUI

        var guiVals = _gui.getGUIvals();
        
        // filter data if needed
        if (guiVals.plotFilter.filterOn) data = filterData(data);

        // generate facets and group data
        var facets = setupFacetGrid(guiVals, data);
        var facetRows = Object.keys(facets);
        var facetCols = Object.keys(facets[facetRows[0]]);

        var facetVals = guiVals.plotFacets;
        var hVal = facetVals['col-facet'].value;
        var vVal = facetVals['row-facet'].value;
        var hLabel = facetVals['col-facet'].label;
        var vLabel = facetVals['row-facet'].label;

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

        return;

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
     * When a user uploads a file, this function will
     * inpsect the parsed data and determine the data
     * type for each column as 'int','float','str' or
     * 'datetime'
     *
     * @param {array} data - each array element is an object 
     *   with column names as keys, and row value as value
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
    function findColumnTypes(data, ignoreCol, colTypes) {
        var colMap = {};

        // add colTypes keys (column names) to the ignore list
        // we will manually add them in before the return
        if (colTypes && Object.keys(colTypes).length) ignoreCol.concat(Object.keys(colTypes));

        // init with first row vals
        var colNames = Object.keys(data[0]); // column names
        var colVals = Object.values(data[0]); // row 1 values
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
        data.forEach(function(d) {
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
     * Generate the proper facet grid setup based on GUI options
     * and group data.
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

        var facetRow, facetCol, colDat, colWrap, plotDom;
        var rowDat = ['row0'];
        var colDat = ['col0'];
        var numRows = rowDat.length;
        var numCols = colDat.length;
        var aspectRatio = 2.0; // width to height ratio
        var plotDom = d3.select('#' + _canvasWrap);
        var facetVals = guiVals.plotFacets;
        var minRowHeight = guiVals.plotFacets.minRowHeight[0];

        if (facetVals.facetOn) {  // if plotting with facets
            var hVal = facetVals['col-facet'].value
            var vVal = facetVals['row-facet'].value
            if (vVal) { // if row facet specified
                facetRow = facetVals['row-facet'].label;
                rowDat = _unique[facetRow];
            }
            if (hVal) { // if col facet specified
                facetCol = facetVals['col-facet'].label
                colDat = _unique[facetCol];
            }
            colWrap = (facetVals.colWrap) ? facetVals.colWrap.value : false;

            numRows = (colWrap) ? Math.ceil(colDat.length / colWrap) : rowDat.length;
            numCols = (colWrap) ? colWrap : colDat.length;
        }


        // calculate width/height of each facet 
        var colWidth = jQuery('#guiPanel').width() / numCols;
        console.log(jQuery('#'+ _guiWrap).width());
        var rowHeight = typeof minRowHeight === 'number' ? minRowHeight : colWidth / aspectRatio;

        // generate DOM elements
        var facetCount = 0;
        for (var i = 0; i < numRows; i++) {

            var row = plotDom.append('div')
                .attr('class', 'facetRow')
                .attr('id', 'row_' + i);

            for (var j = 0; j < numCols; j++) {
                row.append('div')
                    .attr('class', facetCount%2==0 ? 'facet fill' : 'facet')
                    .attr('id','facet_'+facetCount)
                    .style({height: rowHeight + 'px', width: colWidth + 'px'})
                facetCount++;
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
    d3.select('#'+selector).html(tmp);
}

