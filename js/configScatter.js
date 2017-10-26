var scatterConfig = {
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
