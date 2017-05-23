// all functions associated with generating the 
// NVD3 plots: http://nvd3.org/examples/index.html





/**
 * Once all GUI options and data are set, we can
 * render the C3 plot
 *
 * @param {obj} dat - data for each facet in form {row: col: {dat}}
 * @param {string} sel - selector for facet into which to render plot
 * @param {obj} guiVals - GUI option values
 * @param {string} title - [optional] title for plot, should be null if no title
 *
 * @return void
 */
function populateNVD3Chart(dat, sel, guiVals, title) {

    // nvd3 expects SVG to exist already
    d3.select(sel).append('svg');

    var chart;

    if (guiVals.plotType.value == 'scatter') {
        var tmp = prepDataForScatter(dat, guiVals);

        // create the chart
        nv.addGraph(function() {
            chart = nv.models.scatterChart()
                //.showDistX(false)
                //.showDistY(false)
                .useVoronoi(true)
                .color(d3.scale.category10().range())
                .duration(300);

            formatAxisTitle(chart, guiVals);
            formatTooltip(chart, guiVals);


            d3.select(sel + ' svg')
                .datum(tmp)
                .call(chart);
            nv.utils.windowResize(chart.update);
            
            chart.dispatch.on('stateChange', function(e) { ('New State:', JSON.stringify(e)); });

        });
    } else if (guiVals.plotType.value == 'bar') {
        var aggData = prepDataForBar(dat, guiVals.axisX.label, guiVals.axisY.label);

        // create chart
        nv.addGraph(function() {
            chart = nv.models.discreteBarChart()
                .x(function(d) { return d.label })
                .y(function(d) { return d[guiVals.aggMethod.value] })
                .staggerLabels(false)
                .showValues(true)
                .duration(250);

            formatAxisTitle(chart, guiVals);
            formatTooltip(chart, guiVals);

            d3.select(sel + ' svg')
                .datum(aggData)
                .call(chart);
            nv.utils.windowResize(chart.update);
        });
    } else if (guiVals.plotType.value == 'line') {
        var aggData = prepDataForLine(dat, guiVals.axisX.label, guiVals.axisY.label, guiVals.lineGroup.label);

        if (aggData) { // if data properly prepared

            // create chart
            nv.addGraph(function() {
                chart = nv.models.lineChart()
                    .options({
                        duration: 300,
                        useInteractiveGuideline: true
                    });

                formatAxisTitle(chart, guiVals);
                formatTooltip(chart, guiVals);

                d3.select(sel + ' svg')
                    .datum(aggData)
                    .call(chart);
                nv.utils.windowResize(chart.update);
            });

        }
    }

}





/*
 * Adjust default tooltip formatting
 *
 * @param {obj} chart - nvd3 chart object
 * @param {obj} guiVals - GUI option values
 *
 * @return void
 */
function formatTooltip(chart, guiVals) {
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







/*
 * Prep incoming data and format it for use in scatter plot
 *
 * @param {obj} dat - data for each facet in form {row: col: {dat}}
 * @param {obj} guiVals - GUI option values
 *
 * @return [arr]
 * [group1, group2, ...] where each group will get it's own color
 * group is an object {key: "group name", values: [vals]}
 * where vals is an object {shape: XX, size: XX, x: XX, y: XX}
 * In the case of only a single or no group (e.g. plot all data)
 * the assigned group is 'all data'.
*/
function prepDataForScatter(dat, guiVals) {

    var tmp = d3.nest()
        .key(function(d) { return (guiVals.color.label in d ) ? d[guiVals.color.label] : 'all data'; }) // make up a group name if not grouping by anything
        .rollup(function(v) {
            var tmp = [];
            v.forEach(function(d,i) {
                tmp.push({
                    x: d[guiVals.axisX.label], 
                    y: d[guiVals.axisY.label],
                    size: 0.1,
                    shape: 'circle',
                });
            })
            return tmp;
        })
        .entries(dat)

    
    return tmp;

}







/*
 * Prep incoming data and format it for use in line plot
 *
 * @param {obj} dat - data for each facet in form {row: col: {dat}}
 * @param {obj} guiVals - GUI option values
 *
 * @return [obj] - false if error with the data setup otherwise
 * array of objects where each object is a line and has the form:
 * "area": true/false,
 * "classed": "dashed" (omit if line not dashed)
 * "color": line color e.g. "#ff7f0e",
 * "key": line name,
 * "seriesIndex": int,
 * "strokeWidth": int,
 * "values": [
 *      {
 *      "series": must be same value as "seriesIndex",
 *      "x": XX,
 *      "y": XX
 *      },
 *      ...
 *  ]
 *
 */
function prepDataForLine(dat, axisX, axisY, lineGroups) {

    var error = false;
    var tmp = d3.nest()
        .key(function(d) { return d[lineGroups] })
        .key(function(d) { return d[axisX] })
        .rollup(function(v) { 
            if (v.length > 1) error = true;
            return {
                y: v[0][axisY],
            }; 
        })
        .entries(dat);

    if (error) { 
        displayWarning("The given combination of X-axis, Y-axis and Lines does not result in a unique data point.", true);
        return false;
    }


    var formatDat = tmp.map(function(d, i) { 
        return {
            "area": false,
            "key": d.key,
            "seriesIndex": i,
            "strokeWidth": 4,
            "values": d.values.map(function(v) { 
                return {
                    "series": i,
                    "x": convertToNumber(v.key),
                    "y": v.values.y,
                }
            }),
        }
    })

    return formatDat;
}



/*
 * Prepare data for use with bar
 *
 * In the case of a tall data format, the data must be aggregated
 * for plot types such as bar. This funtion will group the data
 * by the GUI values for axisX and then aggregate on the 
 * axisY values.
 *
 * @param {obj} dat - data for each facet in form {row: col: {dat}}
 * @param {str} groupField - field in data to group on
 * @param {str} aggField - field in data on which to apply aggregate function on
 *
 * @return [obj] - array of objects in the form:
 * [ 
 *    {
 *      "key": "Agg data",
 *      "values": [
 *        { 
 *          "label" : grouped axisX value,
 *          "count" : XX,
 *          "mean" : XX,
 *          "median" : XX,
 *          "sum" : XX,
 *          "variance" : XX
 *        } , 
 *        { 
 *          "label" : grouped axisX value,
 *          "count" : XX,
 *          "mean" : XX,
 *          "median" : XX,
 *          "sum" : XX,
 *          "variance" : XX
 *        } , 
 *        ....
 *    }
 * ]
 */
function prepDataForBar(dat, groupField, aggField) {

    var tmp = d3.nest()
        .key(function(d) { return d[groupField] })
        .rollup(function(v) { return {
                count: v.length,
                mean: d3.mean(v, function(d) { return d[aggField]; }), 
                median: d3.median(v, function(d) { return d[aggField]; }), 
                sum: d3.sum(v, function(d) { return d[aggField]; }), 
                variance: d3.variance(v, function(d) { return d[aggField]; }), 
            }; })
        .entries(dat);

    var aggDat = [{"key": "Agg data", "values": tmp.map(function (d) { var tmp = d.values; tmp['label'] = d.key; return tmp; })}];
    
    return aggDat;


}
