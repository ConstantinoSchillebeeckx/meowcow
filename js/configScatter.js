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
            type: 'toggle'
        },
        {
            accessor: 'showDistY',
            label: 'Show Y distr.',
            type: 'toggle'
        },
/*
this option doesn't 
seem to do anything
        {
            accessor: 'showLabels', 
            label: 'Show labels',
            type: 'toggle'
        },
*/
    ]
}
