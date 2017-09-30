var lineConfig = {
    allowFacets: true,
    label: 'Line',
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
            accessor: 'lineGroup', 
            label: 'Color group', 
            addOption: {None: false},
        } 
    ],
    options: [
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
            type: 'toggle',
            domClass: 'col-sm-3',
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
}
