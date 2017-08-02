# meowcow

Quickly visualize multi-dimensional data through various charting types such as:

- bar
- box
- violin
- scatter
- line 

## TODO

- docs
- make setup: as a list instead of an object e.g. setup: [{name:'x', type:'quantitative', accessor:'x'},{}]
- readme
- handle missing data - added a 'missing' option in config

overal chart options:
- log scale axes
- show labels
- manually define labels
- axis left/right or top/bottom
- tick format?
- title
- focus


## Input data

Input data is composed of two pieces:

#### 1. RAW app data 

The tabular data that you are trying to visualize. It should be stored as an array of arrays where each inner array represents a row of your data. It is assumed that your data is organized in a tall fashion where each column defines an attribute of the data; each of these attributes will serve as dimnesion that can be visualized by specifying the proper option in the GUI. 

An example dataset is provided and loaded by [tall.js](js/tall.js#L18); in table form, the first two rows are formatted as

ID | Subject | Value | Date | Study | Treatment | StudyType | Day
--- | --- | --- | --- | --- | --- | --- | ---
1 | 81 | 9.68 | 2015-02-05 | I | W55 | alpha | 0
2 | 4 | 13.3 | 2014-08-25 | VI | I4 | beta | 21

Which should be converted into the format:
```javascript
var dat = [["1","81","9.68","2015-02-05","I","W55","alpha","0"],["2","4","13.3","2014-08-25","VI","I4","beta","21"]];
```

Note that data can be input as strings and will be converted to the proper type (`int` of `float`) automatically.

Note that in the above example, our data comes with a surrogate key column `ID` which we want to ignore - specify this attribute as an `"excluded"` data type.

## Usage

Designate a DOM element into which the GUI and plots should be rendered, e.g. `<body class='container-fluid' id='renderHere'></body>`

Then, instantiate everything (on load) with something like:
```javascript
<script>
    $(function() {

        var moo = meowcow()
            .container('#renderHere')
            .data(inputDat) // declared in js/tall.js - if left unspecified, a modal will be loaded which allows user to upload a delimited file
            .config(guiSetup) // declared in js/config.js
            .ignoreCol(['_UID']) // ignore these columns in input data
            .colTypes({Subject: 'str'}) // overwrite column type
            .run();
    });
</script>
```
