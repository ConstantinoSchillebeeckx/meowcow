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
    // - cols: input object loaded from js/tall.js with datatable fields as keys and SQL column type as values
    typesMap = {
        'str': 'category', 
        'float':'indexed', 
        'int':'indexed', 
        'datetime':'timeseries'
    } // map from SQL field type to axis type

    dat = convertToJSON(inputDat, colTypes);
    unique = getAllUnique(dat, colTypes);

    makeGUI(colTypes);

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
function renderPlot(sel) {

    // clear any previously existent plots/warnings
    jQuery(sel).empty();
    jQuery('#warning').empty();

    // get GUI vals
    var guiVals = getGUIvals('form');
    var nvd3Types = ['scatter','bar','line'];
    var distroplotTypes = ['box','violin','bean'];


    // before rendering anything, let's ensure the selected GUI options make sense to render
    if (guiWarnings(guiVals, unique)) return;


    // generate facets and group data
    var facets = setupFacetGrid(sel, guiVals, dat, unique);
    var facetRows = Object.keys(facets);
    var facetCols = Object.keys(facets[facetRows[0]]);


    // draw plot in each facet
    facetRows.forEach(function(rowName,i) {
        facetCols.forEach(function(colName,j) {
            selFacet = '#row_' + i + '-col_' + j;


            var facetDat = facets[rowName][colName];

            if (typeof facetDat !== 'undefined') {

                var title = null;
                if (guiVals.facets) {
                    if (guiVals.facetRow.value && guiVals.facetCol.value) {
                        title = guiVals.facetRow.label + ' = ' + rowName + ' | ' + guiVals.facetCol.label + ' = ' + colName;
                    } else if (guiVals.facetRow.value || guiVals.facetCol.value) {
                        title = guiVals.facetRow.label ? guiVals.facetRow.label + ' = ' + rowName : guiVals.facetCol.label + ' = ' + colName;    
                    }
                }

                // currently using two libraries to render plots
                // nvd3.js handles most plots
                // categorical x-axis plots (except for bar) are handled by 'distroplot': http://bl.ocks.org/asielen/92929960988a8935d907e39e60ea8417
                if (distroplotTypes.includes(guiVals.plotType.value)) { // use distroplot.js
                    var chart = populateDistroChart(facetDat, selFacet, guiVals, title);
                } else if (nvd3Types.includes(guiVals.plotType.value)) { // use nvd3.js
                    var chart = populateNVD3Chart(facetDat, selFacet, guiVals, title);
                }
            }

        });

        // update list of columns for new row
        if (facetRows.length > 1) facetCols = Object.keys(facets[facetRows[1]]);
    })
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
    if (guiVals.facets) {  // if plotting with facets
        if (guiVals.facetRow.value) { // if row facet specified
            facetRow = guiVals.facetRow.label;
            rowDat = unique[facetRow];
        }
        if (guiVals.facetCol.value) { // if col facet specified
            facetCol = guiVals.facetCol.label;
            colDat = unique[facetCol];
        }
        colWrap = (guiVals.colWrap) ? guiVals.colWrap.value : false;

        numRows = (colWrap) ? Math.ceil(colDat.length / colWrap) : rowDat.length;
        numCols = (colWrap) ? colWrap : colDat.length;
    }

    // calculate width/height of each facet 
    var colWidth = jQuery('#gui').width() / numCols;
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
        var unique = [...new Set(dat.map(item => item[key]))].sort(); // http://stackoverflow.com/a/35092559/1153897
        if (colTypes[key] == 'int' || colTypes[key] == 'float') unique = unique.sort(sortNumber); // sort numerically if needed
        vals[key] = unique.map(function(d) { return d });
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
 * Display a dismissible alert inside a div
 * with id 'warning'
 *
 * Note: this will clear out any divs
 * with the class "facetRow"
 *
 * @param {str} message - message to display
 * @param {bool} error [optional] - if true
 *  alert class will be .alert-danger (red), otherwise
 *  class will be .alert-warning
 *
 * @return void
*/

function displayWarning(message, error=false) {

    if (typeof error == 'undefined') error = false;

    if (error) {
        var tmp = '<div class="alert alert-danger alert-dismissible" role="alert">';
    } else {
        var tmp = '<div class="alert alert-warning alert-dismissible" role="alert">';
    }
    tmp += '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>';
    tmp += message;
    tmp += '</div>';
    jQuery('#warning').html(tmp);
    jQuery('.facetRow').empty(); // clear out any displayed plot

}




/**
 * Once all GUI options and data are set, we can
 * render the distro plot
 *
 * @param {obj} dat - data for each facet in form {row: col: {dat}}
 * @param {string} sel - selector for facet into which to render plot
 * @param {obj} guiVals - GUI option values
 * @param {string} title - [optional] title for plot, should be null if no title
 *
 * @return void
 */
function populateDistroChart(dat, sel, guiVals, title) {

    if (typeof dat === 'undefined') return; // no data for this row & col combination

    jQuery(sel).addClass('chart-wrapper'); // needed for styling

    var chart = makeDistroChart({
        data:dat,
        xName:guiVals.axisX.label,
        yName:guiVals.axisY.label,
        selector:sel,
        constrainExtremes:true,
        title:title,
        margin:{top: 15, right: 20, bottom: 60, left: 50},
    });

    // init
    chart.renderBoxPlot();
    chart.renderDataPlots();
    chart.renderViolinPlot({showViolinPlot:false});
    chart.renderNotchBoxes({showNotchBox:false});

    // if [None] plot type
    if (guiVals.plotType.value == null) chart.boxPlots.hide();

    // notched box plot
    if (guiVals.plotType.value == 'box' && guiVals.notchedBox) {
        chart.renderNotchBoxes({showNotchBox:true});
        chart.boxPlots.show({showBox:false})
    }

    // change shape if needed (from box type)
    if (guiVals.plotType.value == 'violin') {
        if (guiVals.boundedViolin) { // bounded violin
            chart.violinPlots.show({reset:true,clamp:1});
        } else { // unbounded violin
            chart.violinPlots.show({reset:true,clamp:0});
        }
        chart.boxPlots.show({reset:true, showWhiskers:false, showOutliers:false, boxWidth:10, lineWidth:15, colors:['#555']});
        chart.notchBoxes.hide();
        chart.dataPlots.change({showPlot:false,showBeanLines:false})
    } else if (guiVals.plotType.value == 'bean') {
        chart.violinPlots.show({reset:true, width:75, clamp:0});
        chart.dataPlots.show({showBeanLines:true, beanWidth:15, showPlot:false, colors:['#555']});
        chart.boxPlots.hide();
        chart.notchBoxes.hide()
    }

    // add individual points
    if (guiVals.points.value == 'swarm') {
        chart.dataPlots.show({showPlot:true, plotType:'beeswarm', colors:null});
    } else if (guiVals.points.value == 'scatter') {
        chart.dataPlots.show({showPlot:true, plotType:20, colors:null});
    }


    if (guiVals.trendMean) {
        chart.dataPlots.change({showLines:['mean'], lineColors:{mean:'#555'}})
    } else {
        chart.dataPlots.change({showLines:false})
    }

    return chart;
}

