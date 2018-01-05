// setup GUI
var guiSetup = {
    useToyData: true, // whether to show toy data options in file upload modal
    missing: ['NULL'], // data to treat as missing, empty string is implied
    plotTypes: {
        heatMapChart: heatMapConfig,
        scatterChart: scatterConfig,
        lineChart: lineConfig,
        distroPlotChart: distroPlotCofig,
    },
    showSetupTab: true,
    showFlourishTab: true,
    showOptionsTab: true,
    showFacetsTab: true,
    showFiltersTab: true,
    showDataTab: true,
    init: {
        plotSetup: {},
        plotFilter: {},
        plotFlourish: {},
        plotOptions: {},
        plotSetup: {
            plotTypes: "distroPlotChart",
            x: "Study",
            y: "Weight",
        }
    }
}
