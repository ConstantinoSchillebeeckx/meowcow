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
                'robustCenterScaleAll'],
            help: {
                content: "Type of normalization to apply to cells; see <a href='http://www.arrayserver.com/wiki/index.php?title=Heatmap_normalization'>here</a> for a description of the normalization types.",
                title: "Help",
                trigger: "hover",
                html: true,
                placement: "auto right"
            },
        },
        {
            accessor: 'highContrastText',
            label: 'High contrast text',
            type: 'toggle',
            setDefault: true,
            help: {
                content: "Automatically adjust the color of the cell value label based on the cell background for optimized contrast.",
                title: "Help",
                trigger: "hover",
                html: true,
                placement: "auto right"
            },
        },
        {
            accessor: 'showGrid',
            label: 'Show grid',
            type: 'toggle',
            help: {
                content: "Show/hide the horizontal and vertical grid lines.",
                title: "Help",
                trigger: "hover",
                html: true,
                placement: "auto right"
            },
        },
        {
            accessor: 'showCellValues',
            label: 'Show cell values',
            type: 'toggle',
            setDefault: true,
            help: {
                content: "Show/hide the cell value labels.",
                title: "Help",
                trigger: "hover",
                html: true,
                placement: "auto right"
            },
        }, {
            accessor: 'missingDataColor',
            label: 'Missing data label',
            type: 'text',
            setDefault: '#bcbcbc',
            domClass: 'col-sm-2',
            help: {
                content: "Cell background color to use when data are missing or NaN (e.g. during normalizing calculations) [default: #bcbcbc]",
                title: "Help",
                trigger: "hover",
                html: true,
                placement: "auto right"
            },
        },{
            accessor: 'missingDataLabel',
            label: 'Missing data label',
            type: 'text',
            setDefault: '',
            domClass: 'col-sm-2',
            help: {
                content: "Cell value label to use when data are missing or NaN (e.g. during normalizing calculations) [default: no label]",
                title: "Help",
                trigger: "hover",
                html: true,
                placement: "auto right"
            },
        },{
            accessor: 'cellBorderWidth',
            label: 'Cell border width',
            type: 'slider',
            options: {start: 4, range: {'min':0, 'max':10}, step:1, connect: [true, false]},
            format: function(d) { return '[' + parseInt(d) + ']' },
            help: {
                content: "Width, in pixels, between cells.",
                title: "Help",
                trigger: "hover",
                html: true,
                placement: "auto right"
            },
        },
    ]
}
