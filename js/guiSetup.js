// setup GUI
var guiSetup = {
    plotTypes: {
        distroPlotChart: { // must be a named NVD3 plot type e.g. scatterChart
            label: 'distro plot',
            allowFacets: true,
            //parseData: function(d) { return d.map(function(e) { return e.Study }); },
            parseData: false,
            setup: {
                x: {
                    type: 'ordinal',
                    accessor: 'x',
                },
                y : {
                    type: 'interval',
                    accessor: 'value', 
                },
                z : {
                    name: 'Color group',
                    type: 'ordinal',
                },
            },
            options: [
                {
                    accessor: 'plotType', // this will also set the select ID
                    label: 'Style',
                    type: 'select',
                    values: ['box','violin']
                },{
                    accessor: 'notchBox',
                    label: 'Notch boxes',
                    type: 'toggle',
                    options: {
                        on: 'Enabled',
                        off: 'Disabled',
                        width: 90,
                    }
                }, {
                    accessor: 'jitter',
                    label: 'Point jitter',
                    type: 'slider',
                    options: {start: 0.7, range: {'min':0, 'max':1}, step:0.1},
                    format: function(d) { return '[' + parseFloat(d).toFixed(1) + ']' }
                }
            ]
        },
        scatter: {
            label: 'scatter plot',
            allowFacets: false,
            setup: {
                x: {
                    type: 'interval'
                },
                y : {
                    type: 'interval'
                },
                z : {
                    name: 'Color group',
                    type: 'ordinal'
                },
            },
            options: [
                {
                    name: 'plotType',
                    label: 'Style',
                    type: 'select',
                    values: ['box','violin']
                },{
                    name: 'moo',
                    type: 'toggle',
                    options: {
                        on: 'Enabled',
                        off: 'Disabled'
                    }
                }, {
                    name: 'meow',
                    type: 'slider',
                }
            ]
        }
    },
}
