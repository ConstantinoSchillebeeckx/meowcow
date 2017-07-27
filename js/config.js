// setup GUI
var guiSetup = {
    plotTypes: {
        scatterChart: {
            label: 'Scatter',
            setup: {
                x: {
                    type: 'quantitative',
                    accessor: 'value', 
                },
                y: {
                    type: 'quantitative',
                    accessor: 'value', 
                },
                z: {
                } 
            }
        },
        distroPlotChart: { // must be a named NVD3 plot type e.g. scatterChart
            label: 'Distribution', // if not provided, will use distroPlotChart
            allowFacets: true,
            //parseData: function(d) { return d.map(function(e) { return e.Study }); },
            parseData: false,
            setup: { // this will populate the 'Setup' tab
                x: {
                    type: 'ordinal',
                    accessor: 'x',
                },
                y : {
                    type: 'quantitative',
                    accessor: 'value', 
                },
                z : {
                    label: 'Color group',
                    type: 'ordinal',
                    addOption: {None: false}
                },
            },
            options: [ // this will populate the 'Options' tab
                {
                    accessor: 'plotType', // this will also set the select ID
                    label: 'Style',
                    type: 'select',
                    values: {Box: 'box', Violin: 'violin', Scatter: false} // can also just be an array
                },{
                    accessor: 'whiskerDef',
                    label: 'Whisker definition',
                    type: 'select',
                    values: ['iqr','minmax','stddev']
                },{
                    accessor: 'observationType',
                    label: 'Observation type',
                    type: 'select',
                    values: ['random','swarm','centered'],
                    addOption: {None: false}
                }, {
                    accessor: 'bandwidth',
                    label: 'KDE bandwidth',
                    type: 'text',
                    required: false,
                    help: { // uses same options as bootstrap popover options https://getbootstrap.com/javascript/#popovers
                        content: "Heuristic for kde bandwidth calculation, can be <code>float</code> or <code>str</code>; if <code>str</code>, must be one of <em>scott</em> or <em>silverman</em>.<br><strong>[default 'scott']</strong>",
                        title: "Help",
                        trigger: "hover",
                        html: true,
                        placement: "auto right"
                    },
                    set: 'scott'
                }, {
                    accessor: 'resolution',
                    label: 'KDE resolution',
                    type: 'slider',
                    options: {start: 50, range: {'min':0, 'max':100}, step:1, connect: [true, false]},
                    format: function(d) { return '[' + parseInt(d) + ']' }
                }, {
                    accessor: 'showMiddle',
                    label: 'Middle line',
                    type: 'select',
                    values: {Mean: 'mean', Median: 'median', None: false}
                }, {
                    accessor: 'jitter',
                    label: 'Point jitter',
                    type: 'slider',
                    options: {start: 0.7, range: {'min':0, 'max':1}, step:0.1, connect: [true, false]},
                    format: function(d) { return '[' + parseFloat(d).toFixed(1) + ']' }
                }, {
                    accessor: 'maxBoxWidth',
                    label: 'Max box width',
                    type: 'slider',
                    options: {start: 0, range: {'min':0, 'max':50}, step:1, connect: [true, false],},
                    format: function(d) { return '[' + parseInt(d) + ']' },
                    minValueReplace: null, // replace slider value with this if slider on minimum (0 in this case)
                    showValueReplace: false, // show value specified by either minValueReplace/maxValueReplace in GUI
                }, {
                    accessor: 'observationRadius',
                    label: 'Observation radius',
                    type: 'slider',
                    options: {start: 3, range: {'min':0, 'max':20}, step:1, connect: [true, false],},
                    format: function(d) { return '[' + parseInt(d) + ']' },
                },{
                    accessor: 'notchBox',
                    label: 'Notch boxes',
                    type: 'toggle',
                    options: {
                        on: 'Enabled',
                        off: 'Disabled',
                        width: 90,
                    }
                },{
                    accessor: 'hideWhiskers',
                    label: 'Hide whiskers',
                    type: 'toggle',
                    options: {
                        on: 'Yes',
                        off: 'No',
                    },
                    class: 'col-sm-2',
                }, {
                    accessor: 'squash',
                    label: 'Squash',
                    type: 'toggle',
                    options: {
                        on: 'Yes',
                        off: 'No',
                    },
                    class: 'col-sm-2',
                }, {
                    accessor: 'showOnlyOutliers',
                    label: 'Show only outliers',
                    type: 'toggle',
                    options: {
                        on: 'Yes',
                        off: 'No',
                    },
                    set: true, // set default to on instead of false
                    class: 'col-sm-2',
                }
            ]
        },
    },
}
