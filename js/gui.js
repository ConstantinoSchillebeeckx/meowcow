/**
 * Generate GUI which defines all options for plotting.
 *
 * Will generate all the neccessarry inputs needed to specify
 * the plot based on the fields associated with the current dataset.
 *
 * GUI will be generally setup into 3 rows:
 * - overall setup (x-axis, y-axis, plot type, facets)
 * - facet options (hidden if not specified)
 * - plot options
 *
 * Note that the field data type is taken into account in order to display
 * proper options in the the GUI. For example, for the Y-axis, only fields
 * that are made up of numbers (int/float) are displayed.
 *
 * @param {obj} colTypes - {col_name: col_type (e.g. int,float,str,datetime)}
 * @param {str} div - ID of dom within which to render GUI
 *
 * @return void
 */
function makeGUI(colTypes, div) {

    var fields = Object.keys(colTypes); // fields in data

    if (typeof div === 'undefined') div = '#gui'

    var dom = d3.select(div);

    var panel = dom.append('div')
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
        .attr('class','panel-collapse collapse in')
        .append('div')
        .attr('class','panel-body')
        .append('form')

    form.append('h3').text('Plot setup');

    var inputRowSetup = form.append('div')
        .attr('class','row')
        .attr('id','plotSetup')

    form.append('hr');


    // options for specifying row/col facets
    var inputRowFacet = form.append('div')
        .attr('id','rowFacet')
        .attr('class','row')
        .append('div')
        .attr('class','col-sm-12')
        .append('h3').text('Facet options')
        .append('div')
        .attr('class','row')

    form.append('h3').text('Plot options');

    // options for specifying plot options
    var inputRowOptions = form.append('div')
        .attr('class','row')
        .attr('id','guiOptions')


    // submit button
    form.append('div')
        .attr('class','row')
        .append('div')
        .attr('class','col-sm-12')
        .append('button')
        .attr('class','btn btn-primary pull-right')
        .attr('type','button')
        .text('Render')
        .on('click', function() {renderPlot('#canvas')})

    // figure out which columns allowed for x-axis (all types except for 'excluded')
    var optionsX = fields.filter(function(col) {
        if (colTypes[col] != 'excluded') return col;
    })
    var axisX = generateFormSelect(optionsX, inputRowSetup, 'axisX', 'X-axis', colTypes, false, 'col-sm-3');
    axisX.on('change', function() { selectChangePlotType(inputRowOptions, colTypes); }); // so that the "Lines" select can be updated if X/Y axis changed

    // figure out which columns allowed for y-axis (only int/float types)
    var optionsY = fields.filter(function(col) {
        var colType = colTypes[col]; // all all types for y-axis
        if (colType !== 'excluded' && (colType == 'int' || colType == 'float')) return col;
    });
    var axisY = generateFormSelect(optionsY, inputRowSetup, 'axisY', 'Y-axis', colTypes, false, 'col-sm-3');
    axisY.on('change', function() { selectChangePlotType(inputRowOptions, colTypes); }); // so that the "Lines" select can be updated if X/Y axis changed

    // set plot types
    var plotTypes = ['scatter','box','violin','bean','bar','line'];
    var plotType = generateFormSelect(plotTypes, inputRowSetup, 'plotType', 'Plot type', null, false, 'col-sm-2');
    plotType.on('change', function() { selectChangePlotType(inputRowOptions, colTypes); });
    selectChangePlotType(inputRowOptions, colTypes); // fire function to populate GUI options

    // set data format
    var dataFormat = generateFormSelect(['tall','wide'], inputRowSetup, 'dataFormat', 'Data format', null, false, 'col-sm-2');


    // setup facet options
    var facet = generateCheckBox(inputRowSetup, 'facets', 'Facets', 'col-sm-2');
    generateFormSelect(optionsX, d3.select('#rowFacet'), 'facetRow', 'Rows', colTypes, true);
    generateFormSelect(optionsX, d3.select('#rowFacet'), 'facetCol', 'Columns', colTypes, true);
    generateFormTextBox(d3.select('#rowFacet'), 'colWrap', 'Column wrap', 'number');
    facet.on('change', function() { selectChangeFacet('#rowFacet'); });
    jQuery('#rowFacet').hide(); // hide initially


}

/**
 * onchange event handler for facet checkbox
 *
 * Will show/hide the GUI options to set the
 * options for the facets including a dropdown
 * for row, column as well as a number input
 * for column wrap.
 *
 * If this is first time calling function, the
 * dropdown boxes will be generated.
 *
 * @param {string} sel - selector of div containing
 *    all the facet options
 *
 * @return void
 */

function selectChangeFacet(sel) {

    var checkState = jQuery("#facets").is(':checked');

    // show/hide div
    (checkState) ? jQuery(sel).show() : jQuery(sel).hide();

}







/**
 * Show/hide plotting options in the GUI based on selected plot type
 *
 * @param {string} sel - DOM element into which to
 *    generate the additional HTML input options
 * @param {obj} colTypes - {col_name: col_type (e.g. int,float,str,datetime)}
 *
 * @return void
*/

function selectChangePlotType(sel, colTypes) {

    var guiVals = getGUIvals('form');
    var plotType = guiVals.plotType.value;
    var fieldType = typesMap[guiVals.axisX.value]; // assumes global 'typesMap' exists

    sel.html(null); // empty contents of options so we can regenerate - might not be the best way of doing things ...

    if (plotType == 'scatter') { // if scatter

        // figure out which columns allowed for color (only str/date type)
        var colors = Object.keys(colTypes).filter(function(col) {
            var colType = colTypes[col]; // all types for x-axis
            if (colType != 'excluded' && colType != 'int' && colType != 'float') return col;
        })
        generateFormSelect(colors, sel, 'color', 'Color', colTypes, true, 'col-sm-3');
    } else if (plotType == 'bar') { // if bar plot type

        if (guiVals.dataFormat.value == 'tall') {
            generateFormSelect(['mean','median','count','sum','variance'], sel, 'aggMethod', 'Aggregation method', null, false, 'col-sm-3');
        }

    } else if (jQuery.inArray(plotType, ['box','violin','bean']) != -1) { 

        generateFormSelect(['scatter','swarm'], sel, 'points', 'Individual points', null, true, 'col-sm-3');

        if (plotType == 'box') {
            generateCheckBox(sel, 'notchedBox', 'Notched box', 'col-sm-3');
        } else if (plotType == 'violin') {
            generateCheckBox(sel, 'boundedViolin', 'Bounded violin', 'col-sm-3');
        } else if (plotType == 'bean') {
        }

        generateCheckBox(sel, 'trendMean', 'Mean trend line', 'col-sm-3');

    } else if (plotType == 'line') {

        // figure out which columns allowed for line groups:
        // those not selected for X or Y axis.
        var lineGroups = Object.keys(colTypes).filter(function(col) {
            if (col != jQuery("select[name='axisX'] option:selected").text() && col != jQuery("select[name='axisY'] option:selected").text() && colTypes[col] !== 'excluded') return col;
        })
        generateFormSelect(lineGroups, sel, 'lineGroup', 'Lines', null, false, 'col-sm-3');
    }

}



/**
 * Generate a text box used in a form along with the label. Note that DOM generated
 * by this function will be assigned a col-sm-4 class.
 *
 * NOTE: for type 'text' an alphanumeric regex will be applied
 *       for type 'number' a regex of [1-9] will be applied
 *
 * @param {string} dom - element to which to add form-group (label and select)
 * @param {string} id - id to give to select
 * @param {string} label - label text
 * @param {bool} type - (optional, default=text) type of input box, must be one of text or number
 *
 * @return select DOM
 *
 */

function generateFormTextBox(dom, id, label, type) {

    if (typeof type === 'undefined') type = 'text';

    // ensure type is either text or number
    if (type != 'text' && type != 'number') return;

    var formGroup = dom.append('div')
        .attr('class', 'form-group col-sm-4')
    
    formGroup.append('label')
        .attr('for',id)
        .html(label)

    var select = formGroup.append('input')
        .attr('class','form-control')
        .attr('id',id)
        .attr('name',id)
        .attr('type',type)
        .attr('pattern', function() { return (type == 'text') ? "^[a-zA-Z0-9]*$" : "[1-9]" })

    return select;
}




/**
 * Generate a select used in a form along with the label. Note that DOM generated
 * by this function will be assigned a col-sm-4 class.
 *
 * The 'value' setting for each item in the select will be set to the SQL column
 * type e.g. str, float, datetime, int
 *
 * @param {array}  vals - list of options to populate select with
 * @param {string} dom - element to which to add form-group (label and select)
 * @param {string} id - id to give to select
 * @param {string} label - label text
 * @param {obj} valMap - (optional) keys should all be present in 'vals', value
 *  will be set in the option value attribute; if not provided, 'vals' will
 *  define the values
 * @param {bool} allowEmpty - (optional, default=False) whether to add an 'empty'
 *                            select option the value for which will be ""
 * @param {str} domClass - (optional, default=col-sm-4) class to assign to 
 *   div containing input, should be a boostrap column class type (e.g. col-sm-3)
 *
 * @return select DOM
 *
 */
function generateFormSelect(vals, dom, id, label, valMap, allowEmpty, domClass) {

    if (typeof allowEmpty === 'undefined') allowEmpty = false;
    if (typeof valMap === 'undefined') valMap = null;
    if (typeof domClass === 'undefined') domClass = 'col-sm-4';

    var formGroup = dom.append('div')
        .attr('class', 'form-group ' + domClass)
    
    formGroup.append('label')
        .attr('for',id)
        .html(label)

    var select = formGroup.append('select')
        .attr('class','form-control')
        .attr('id',id)
        .attr('name',id)

    var none = '[None]';
    if (allowEmpty) vals.unshift(none);
        
    select.selectAll('option')
        .data(vals).enter()
        .append('option')
        .text(function (d) { return d; })
        .attr('value', function (d) {
            if (d === none) {
                return null;
            } else if (valMap) {
                return valMap[d];
            } else {
                return d;
            }
        })

    // some 'scope' issue is causing duplication of [None]
    // not sure how to fix
    // lazy way of reverting vals for now
    if (allowEmpty) vals.shift();

    return select;

}



/**
 * Generate a select used in a form along with the label. Note that DOM generated
 * by this function will be assigned a col-sm-4 class.
 *
 * @param {string} dom - element to which to add form-group (label and select)
 * @param {string} id - id to give to select
 * @param {string} label - label text
 * @param {str} domClass - (optional, default=col-sm-4) class to assign to 
 *   div containing input, should be a boostrap column class type (e.g. col-sm-3)
 *
 * @return void
 *
 */
function generateCheckBox(dom, id, label, domClass) {

    if (typeof domClass === 'undefined') domClass = 'col-sm-4';

    var formGroup = dom.append('div')
        .attr('class', 'form-group ' + domClass)
    
    formGroup.append('label')
        .attr('for',id)
        .html(label)

    formGroup.append('br')
    var label = formGroup.append('label')

    var checkBox = label.append('input')
        .attr('type','checkbox')
        .attr('id',id)
        .attr('name',id)

    return checkBox;
}


/**
 * Call to serializeArray() on the GUI form to return
 * all the current settings of the GUI. 
 *
 * A select option of 'None' will return as null.
 * A checked checkbox will return as true, otherwise false
 *
 * Note that for the select inputs, the value returned will
 * be the column type, e.g. str, int, float, datetime, date
 *
 * Note that only visible input fields will be returned.
 *
 * @param {string} sel - selector for form that contains form inputs
 *
 * @return {object} - keys are the input name attribute and
 *   values are:
 *   - for select dropdowns, the value is as object of form
 *     {label: XX, value: XX}. note that for the [None] options
 *     the label and value will both be null
 *   - for checkboxes, the value will be true/false
 *
*/
function getGUIvals(sel) {

    var tmp = jQuery(sel).serializeArray();
    var guiVals = {};
    tmp.forEach(function(d) {
        var isHidden = jQuery("[name='" + d.name + "']").parent().parent().css('display') === 'none';

        if (!isHidden) {
            var val = (d.value == '' || d.value == "[None]") ? null : convertToNumber(d.value);
            var label = jQuery("#" + d.name + " option:selected").text()
            guiVals[d.name] = {}
            guiVals[d.name]['value'] = val;
            guiVals[d.name]['label'] = (label == '[None]') ? null : label;
        }
    })

    // overwrite the checkbox values, otherwise they get stored as 'on'
    var checkBoxes = jQuery(sel + ' input[type="checkbox"]');
    if (checkBoxes.length) {
        checkBoxes.each(function(d) {
            guiVals[this.name] = this.checked;
        })
    }

    return guiVals;

}




/**
 * Check GUI for errors in option choices, if
 * an error exists, display a warning
 *
 * @param {obj} guiVals - return from getGUIvals()
 * @global {} unique - return of getAllUnique()
 *
 * @return true on error, false on no error
 */
function guiWarnings(guiVals, unique) {

    if (guiVals.dataFormat.value === 'wide') {
        displayWarning("Wide data format not yet implemented!", true);
        return true;
    }

    if (guiVals.axisX.label == guiVals.axisY.label) { // ensure x & y axis are different
        displayWarning("The X-axis field cannot be the same as the Y-axis field, please change one of them!", true);
        return true;
    }

    // ensure the proper x-axis type is being used with the selected plot
    if (typesMap[guiVals.axisX.value] !== 'indexed' && guiVals.plotType.value == 'scatter') {
        displayWarning("The chosen X-axis field is not numerical and therefore cannot be used with the plot type <code>scatter</code>. Please change the X-axis field or choose a different plot type.", true);
        return true;
    }

    if (guiVals.facets) {

        var facetRows = (guiVals.facetRow.value) ? unique[guiVals.facetRow.label] : [null];
        var facetCols = (guiVals.facetCol.value) ? unique[guiVals.facetCol.label] : [null];

        if (guiVals.facetCol.value === null && guiVals.facetRow.value === null && guiVals.colWrap.value === null) {
            displayWarning("In order to use facets, you must at least choose something for <code>Rows</code> or <code>Columns</code>", true);
            return true;
        }
        if (facetRows.length > 50 || facetCols.length > 50) { // limit how many facets can be rendered
            displayWarning("Cancelling render because too many facets would be created.", true);
            return true;
        }
        if (guiVals.colWrap.value > 0 && guiVals.facetRow.value !== null) {
            displayWarning("You cannot specify both a <code>Rows</code> and <code>Columns</code> option when specifying <code>Column wrap</code>.", true);
            return true;
        }
        if (guiVals.facetRow.label === guiVals.facetCol.label) {
            displayWarning("You cannot choose the same field for both <code>Rows</code> and <code>Columns</code> options.", true);
            return true;
        }
    }
    return false;
}
