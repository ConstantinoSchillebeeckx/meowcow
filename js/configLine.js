var lineConfig = {
    allowFacets: true,
    inDevelopment: true,
    parseData: function(d) { 
    
        // value of the #pointGroup dropdown
        // ID must be the same as that provided in the axes accessor option
        var group = jQuery('#lineGroup').val(); 

        var data = d3.nest().key(function(e) { 
            return e[group];
        }).entries(d); 

        // in case there is only a single series
        if (data[0].key == 'null' || data[0].key == 'undefined') {
            data[0].key = group !== '' ? group : "Series";
        }

        return data;
    },
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
            skipCheck: true, // skip check whether accessor is an option
        } 
    ],
    options: [
        {
            accessor: 'interpolate',
            label: 'Interpolate',
            type: 'select',
            values: ['linear','step-before','step-after','basis','bundle','cardinal','monotone'],
            domClass: "col-sm-2",
            help: {
                content: "The type of interpolation to use when connecting points.",
                title: "Help",
                trigger: "hover",
                html: true,
                placement: "auto right"
            },
        },
        {
            accessor: 'clipEdge',
            label: 'Clip edge',
            type: 'toggle',
            help: {
                content: "If true, masks lines within the X and Y scales using a clip-path.",
                title: "Help",
                trigger: "hover",
                html: true,
                placement: "auto right"
            },
        },
        {
            accessor: 'useInteractiveGuideline',
            label: 'Interactive guideline',
            type: 'toggle',
            domClass: 'col-sm-3',
            help: {
                content: "Sets the chart to use a guideline and floating tooltip instead of requiring the user to hover over specific hotspots.",
                title: "Help",
                trigger: "hover",
                html: true,
                placement: "auto right"
            },
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
