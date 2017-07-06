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

    // GLOBAL!
    // - dat: input data loaded from js/tall.js
    // - colsTypes: input object loaded from js/tall.js with datatable fields as keys and SQL column type as values
    dat = convertToJSON(inputDat, colTypes);
    unique = getAllUnique(dat, colTypes);

}








/**
 * Call to render a plot with options specified by GUI. Function
 * assumes the globals listed below are defined and that a GUI
 * contains a form element with all the required options for plotting.
 *
 * Called by 'Submit' button click
 *
 * @param {str} sel - selector for DOM into which to render facets and plot; 
 *     this DOM element will be cleared on each call of this function.
 * @global {} dat - return of convertToJSON()
 * @global {} unique - return of getAllUnique()
 * @global {} colsTypes - keys are datatable fields and values are SQL data type
 * 
 * @return void
*/
function renderPlot(gui, sel) {

    // clear any previously existent plots/warnings
    jQuery(sel).empty(); // TODO we should just update the chart if only the options are changed; that way we use the built-in transitions
    jQuery('#warning').empty();


    // get GUI vals
    var guiVals = gui.getGUIvals('form');

    // before rendering anything, let's ensure the selected GUI options make sense to render
    if (gui.guiWarnings(guiVals, unique)) return;
    
    // everything looks good, let's render!
    jQuery('#renderBtn').html('<i class="fa fa-spinner fa-spin"></i>').prop('disabled', true);
    

    // generate facets and group data
    var facets = setupFacetGrid(sel, guiVals, dat, unique);
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
    var plotOptions = gui.options.plotTypes[plotType]; // this defines all plot options and accessors
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

