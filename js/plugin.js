// should be run on app to automatically add plotting button
jQuery(function() {

    if (jQuery('#button-toolbar').length) {
        jQuery('#button-toolbar .btn-primary').after('<button type="button" title="Plot data" class="btn btn-success" onclick="loadPlotData();"><i class="fa fa-bar-chart fa-2x" aria-hidden="true"></i></button>')
    }

});


/**
 * Function to setup the plotting page.
 *
 * Will open data currently shown in app
 * within a new tab and setup the datatable as a global
 * so that it can be properly plotted.
 */
function loadPlotData() {


    // convert globals into proper format for viz
    // cols - obj of column types
    // dat - list of lists with inner list as data table row
    var colTypes = {}
    for (var field in db) {
        if (!db[field].hidden) colTypes[field] = db[field].type.split('(')[0];
    }

    // local storage
    localStorage.setItem("responseDat", JSON.stringify(responseDat));
    localStorage.setItem("colTypes", JSON.stringify(colTypes));
   
    // open new tab and preLoad data after load
    var tab = window.open('/chickenkitchen/meowcow/plot.html') ;

}
