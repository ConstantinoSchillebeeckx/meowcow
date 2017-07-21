/*
TODO
- date picker
- gui setup validation function (needs to be validated against uploaded data)
- implement filtering
- loading in main plot area
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
    var _colTypes,         // automatically detected column types
        _unique            // obj of unique values for each column
    


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

        // prep data
        _colTypes = findColumnTypes(data,ignoreCol,colTypes);
        _unique = getAllUnique(data, _colTypes);

        // build gui
        var gui = GUI()
            .container(container)
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
    d3.select(selector).html(tmp);
}

