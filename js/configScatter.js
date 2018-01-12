var scatterConfig = {
    inDevelopment: true,
    label: 'Scatter',
    parseData: function(d) { 
    
        // value of the #pointGroup dropdown
        // ID must be the same as that provided in the axes accessor option
        var group = jQuery('#pointGroup').val(); 

        var data = d3.nest().key(function(e) { 
            return e[group];
        }).entries(d); 

        // in case there is only a single series
        if (data[0].key == 'null' || data[0].key == 'undefined') {
            data[0].key = group !== '' ? group : "Series";
        }

        return data;
    },
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
            skipCheck: true, // skip check whether accessor is an option
        } 
    ],
    options: [
        {
            accessor: 'showDistX',
            label: 'Show X distr.',
            type: 'toggle',
            help: {
                content: "Show the x-value distribution of points along the x-axis.",
                title: "Help",
                trigger: "hover",
                html: true,
                placement: "auto right"
            },
        },
        {
            accessor: 'showDistY',
            label: 'Show Y distr.',
            type: 'toggle',
            help: {
                content: "Show the y-value distribution of points along the y-axis.",
                title: "Help",
                trigger: "hover",
                html: true,
                placement: "auto right"
            },
        },
    ]
}
