jQuery(function() {
    var chart = c3.generate({
        data: {
            columns: [
                ['data1', 30, 200, 100, 400, 150, 250],
            ],
            type: 'scatter'
        },
        bar: {
        },
        oninit: function () { generateErrorBars([10,10,10,30,40,60]) },
        onrendered: function () { updateErrorBars([10,10,10,30,40,60]) },
    });


})

/**
 * Render the error bar with the proper position and shape based on the
 * location of the .c3-circle. Note that it will associate the error i
 * with c3-circle-i.
 *
 * @param {arr} errors - array containing the value of error to display
 *
 * @return void
 */

function updateErrorBars(errors) {

    d3.selectAll('circle.c3-circle').each(function(d, i) {
        var error = errors[i];
        var x = parseFloat(this.getAttribute('cx'));
        var y = parseFloat(this.getAttribute('cy'));
        errorBars.select('.error-bar-' + i)
            .attr('d', function(d) {
                var hatWidth = 5;
                var trunk = 'M' + x + ' ' + (y - error) + ' L' + x + ' ' + (y + error) + ' Z ';
                var topHat = 'M' + (x - hatWidth) + ' ' + (y - error) + ' L' + (x + hatWidth) + ' ' + (y - error) + ' Z ';
                var bottomHat = 'M' + (x - hatWidth) + ' ' + (y + error) + ' L' + (x + hatWidth) + ' ' + (y + error) + ' Z';

                return trunk + topHat + bottomHat;
            })
    })

}

/**
 * Generate the DOM elements as paths for each error bar; these will be placed 
 * in the .c3-circles class group. Each path will get the class .error-bars
 * and .error-bar-i where i is an integer.
 *
 * @param {arr} errors - array containing the value of error to display
 *
 * @return void
 */
function generateErrorBars(errors) {

    errorBars = d3.select('.c3-chart-line .c3-circles');

    errorBars.selectAll('path')
        .data(errors)
        .enter().append('path')
        .attr('class', function(d,i) { return 'error-bars error-bar-' + i; });

}
