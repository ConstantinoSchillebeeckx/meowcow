var heatMapConfig = { 
    allowFacets: true,
    label: 'Heatmap', 
    axes: [
        {
            accessor: 'x',
        },
        {
            accessor: 'y', 
        },
        {
            accessor: 'cellValue', 
            label: 'Cell value',
        } 
    ],
    options: [
        {
            accessor: 'normalize',
            label: 'Normalize',
            type: 'select',
            addOption: {None: false},
            values: ['centerRow',
                'robustCenterRow',
                'centerScaleRow',
                'robustCenterScaleRow',
                'centerColumn',
                'robustCenterColumn',
                'centerScaleColumn',
                'robustCenterScaleColumn',
                'centerAll',
                'robustCenterAll',
                'centerScaleAll',
                'robustCenterScaleAll']
        },
        {
            accessor: 'highContrastText',
            label: 'High contrast text',
            type: 'toggle',
            setDefault: true,
        },
        {
            accessor: 'showGrid',
            label: 'Show grid',
            type: 'toggle',
        },
        {
            accessor: 'showCellValues',
            label: 'Show cell values',
            type: 'toggle',
            setDefault: true,
        }, {
            accessor: 'missingDataLabel',
            label: 'Missing data label',
            type: 'text',
            setDefault: ''
        },{
            accessor: 'cellBorderWidth',
            label: 'Cell border width',
            type: 'slider',
            options: {start: 4, range: {'min':0, 'max':10}, step:1, connect: [true, false]},
            format: function(d) { return '[' + parseInt(d) + ']' }
        },
    ]
}
