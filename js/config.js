// setup GUI
var guiSetup = {
    useToyData: true, // whether to show toy data options in file upload modal
    missing: "", // data to treat as missing
    plotTypes: {
        lineChart: { // plot type, must be available as a model in NVD3
            allowFacets: true, // whether to display facets tab - OPTIONAL, default true
            //parseData: function(d) { return d.map(function(e) { return e.Study }); }, // function used to preprocess data before rendering - OPTIONAL, default false TODO
            label: 'Line', // label to use in select option for this plot type; if not provided, plot type will be used - OPTIONAL
            axes: [ // bind the proper data attribute to the plot's primary axes
                {
                    type: 'quantitative', // ordinal (list of str) or quantitative (numbers) - REQUIRED
                    accessor: 'x', // accessor for given plot type - REQUIRED
                },
                {
                    type: 'quantitative',
                    accessor: 'y', 
                },
                {
                    type: 'ordinal',
                    accessor: 'lineGroup', 
                    label: 'Color group', // option label; if not provided, accessor value will be used - OPTIONAL
                    addOption: {None: false},
                } 
            ],
            options: [ // plot options - see NVD3 documentation 
                {
                    accessor: 'interpolate',
                    label: 'Interpolate',
                    type: 'select',
                    values: ['linear','step-before','step-after','basis','bundle','cardinal','monotone']
                },
                {
                    accessor: 'clipEdge',
                    label: 'Clip edge',
                    type: 'toggle'
                },
                {
                    accessor: 'useInteractiveGuideline',
                    label: 'Interactive guideline',
                    type: 'toggle'
                },
                {
                    accessor: 'focusEnable',
                    label: 'Enable focus',
                    type: 'toggle'
                },
                /*{ TODO implement
                    accessor: 'strokeWidth',
                    label: 'Stroke width',
                    type: 'slider',
                    options: {start: 1.5, range: {'min':0.1, 'max':5}, step:.1, connect: [true, false]},
                    format: function(d) { return '[' + parseFloat(d) + ']' }
                }*/
            ]
        },
        scatterChart: {
            label: 'Scatter',
            axes: [
                {
                    type: 'quantitative',
                    accessor: 'x', 
                },
                {
                    type: 'quantitative',
                    accessor: 'y', 
                },
                {
                    type: 'ordinal',
                    accessor: 'pointGroup', 
                    label: 'Groups',
                    addOption: {None: false},
                } 
            ],
            options: [
                {
                    accessor: 'showDistX',
                    label: 'Show X distr.',
                    type: 'toggle'
                },
                {
                    accessor: 'showDistY',
                    label: 'Show Y distr.',
                    type: 'toggle'
                },
                {
                    accessor: 'showLabels', // need to modify scatter.js https://github.com/ConstantinoSchillebeeckx/nvd3/blob/distrochart/src/models/scatter.js#L579
                    label: 'Show labels',
                    type: 'toggle'
                },
            ]
        },
        distroPlotChart: { // must be a named NVD3 plot type e.g. scatterChart
            label: 'Distribution', // if not provided, will use distroPlotChart
            allowFacets: true,
            //parseData: function(d) { return d.map(function(e) { return e.Study }); },
            parseData: false,
            axes: [ // this will populate the 'Setup' tab
                {
                    type: 'ordinal',
                    accessor: 'x',
                },
                {
                    type: 'quantitative',
                    accessor: 'value', 
                    label: 'Y',
                },
                {
                    label: 'Color group',
                    type: 'ordinal',
                    accessor: 'colorGroup',
                    addOption: {None: false}
                },
            ],
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
                    setDefault: 'scott'
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
                    accessor: 'staggerLabels',
                    label: 'Stagger labels',
                    type: 'toggle',
                    options: {
                        on: 'Yes',
                        off: 'No',
                    },
                    setDefault: true, // set default to on instead of false
                    class: 'col-sm-2',
                }, {
                    accessor: 'showOnlyOutliers',
                    label: 'Show only outliers',
                    type: 'toggle',
                    options: {
                        on: 'Yes',
                        off: 'No',
                    },
                    setDefault: true, // set default to on instead of false
                    class: 'col-sm-2',
                }
            ]
        },
    },
}
