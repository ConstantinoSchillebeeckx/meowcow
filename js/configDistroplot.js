var distroPlotCofig = {
    label: 'Distribution',
    allowFacets: false,
    parseData: false,
    axes: [
        {
            type: 'ordinal',
            accessor: 'x',
        },
        {
            type: 'quantitative',
            accessor: 'y', 
            label: 'Y',
        },
        {
            label: 'Color group',
            type: 'ordinal',
            accessor: 'colorGroup',
            addOption: {None: false}
        },
    ],
    options: [
        {
            accessor: 'plotType', 
            label: 'Style',
            type: 'select',
            values: {Box: 'box', Violin: 'violin', Scatter: false} 
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
            setDefault: 'centered',
        }, {
            accessor: 'bandwidth',
            label: 'KDE bandwidth',
            type: 'text',
            required: false,
            help: {
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
            accessor: 'centralTendency',
            label: 'Middle line',
            type: 'select',
            values: {Mean: 'mean', Median: 'median', None: false},
            setDefault: 'median'
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
            minValueReplace: null, 
            showValueReplace: false, 
        }, {
            accessor: 'pointSize',
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
            domClass: 'col-sm-2',
        }, {
            accessor: 'squash',
            label: 'Squash',
            type: 'toggle',
            options: {
                on: 'Yes',
                off: 'No',
            },
            domClass: 'col-sm-2',
        }, {
            accessor: 'staggerLabels',
            label: 'Stagger labels',
            type: 'toggle',
            options: {
                on: 'Yes',
                off: 'No',
            },
            setDefault: true, 
            domClass: 'col-sm-2',
        }, {
            accessor: 'showOnlyOutliers',
            label: 'Show only outliers',
            type: 'toggle',
            options: {
                on: 'Yes',
                off: 'No',
            },
            setDefault: true,
            domClass: 'col-sm-2',
        }, {
            accessor: 'clampViolin',
            label: 'Clamp violin',
            type: 'toggle',
            options: {
                on: 'Yes',
                off: 'No',
            },
            setDefault: true,
            domClass: 'col-sm-2',
        }
    ]
}
