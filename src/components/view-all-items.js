viewallitems = Vue.component('view-all-items', {
    props: ['websiteText', 'fallbackText', 'classValue', 'classLabel', 'totalValues', 'appliedFilters', 'appliedRanges', 'appliedQuantities', 'format'],
    data() {
        return {
            filtersCount: -1,
            filters: [],
            items: [],
            itemsCount: '',
            currentPage: 1,
            query: '',
            sparqlParameters: []
        }
    },
    template: `
    <div v-if="websiteText!=''">
        <header-view
            :class-label="classLabel"
            :applied-filters="appliedFilters"
            :applied-ranges="appliedRanges"
            :applied-quantities="appliedQuantities"
            @remove-filter="removeFilter"
            @remove-range="removeRange"
            @remove-quantity="removeQuantity"
            @change-page="changePage" >
        </header-view>
        <div class="content" id="viewallitems">
            <div v-if="filtersCount==-1"></div>
            <p v-else-if="filtersCount==0">{{ websiteText.filtersCount||fallbackText.filtersCount }}</p>
            <div v-else-if="filtersCount<40" class="filter-box">
                <img src="images/filter-icon.svg" height="14px" />
                <span v-for="filter in filters">
                    <a 
                        :href="pathForFilter(filter)" 
                        onclick="return false;" 
                        @click.exact="showFilter(filter)" 
                        @click.ctrl="window.open(pathForFilter(filter),'_blank')">
                        {{filter.valueLabel.value}}
                    </a>
                    <b v-if="filters[filtersCount-1].valueLabel.value != filter.valueLabel.value">&middot; </b>
                </span>
            </div>
            <div v-else>
                <a class="classOptions" @click="changePage('filters')">{{ websiteText.addFilter||fallbackText.addFilter }}</a>
            </div>
            <div v-if="totalValues>0" v-html="displayPluralCount(websiteText.itemCount||fallbackText.itemCount, totalValues, true)"></div>
            <div v-if="items.length > 0 && (!totalValues || totalValues > resultsPerPage)" style="text-align: center">
                <a v-if="currentPage>1" @click="displayData('back')">&lt;</a>
                <input 
                    v-model.lazy="currentPage" 
                    @keyup.enter="displayData"
                    type="text" 
                    style="margin-bottom: 15px;width: 48px;text-align: center"> 
                {{totalValues && totalValues < resultsPerPage * 100 ? " / " + Math.ceil(totalValues/resultsPerPage) : ''}}
                <a v-if="!totalValues || currentPage < totalValues/resultsPerPage" @click="displayData('next')">&gt;</a>
            </div>
            <div v-if="websiteText!=''">
                <img v-if="!items.length" src='images/loading.gif'>
                <p v-else-if="items[0].value=='Empty'">{{ websiteText.noItems||fallbackText.noItems }}</p>
                <p v-else-if="items[0].value=='Error'">{{ websiteText.displayItemsError||fallbackText.displayItemsError }}</p>
                <div v-else-if="window.showThumbnails">
                    <a v-for="item in sortSinglePageValues(items)" :href="linkToFilePage(item.file.value)" :title="item.overlay" class="externalLink">
                        <div v-if="item.thumbnailURL" class="thumbnailImage">
                            <figure>
                                <div class="imageWrapper">
                                    <img :src="item.thumbnailURL" />
                                </div>
                                <figcaption>
                                        {{item.caption}}
                                        <span v-if="item.icon" v-html="item.icon" style="margin-left: 5px;">
                                </figcaption>
                            </figure>
                        </div>
                        <div v-else class="thumbnailImage">
                                {{item.caption}}
                                <span v-if="item.icon" v-html="item.icon" style="margin-left: 5px;">
                                </span>
                        </div>
                    </a>
                </div>
                <div v-else>
                        <ul>
                            <li v-for="item in sortSinglePageValues(items)">
                                <a :href="linkToActualItem(item.value.value)" class="externalLink">{{item.valueLabel.value}}</a>
                            </li>
                        </ul>
                </div>
            </div>
            <div v-if="items.length && (!totalValues || totalValues > resultsPerPage)" style="text-align: center">
                <a v-if="currentPage>1" @click="displayData('back')">&lt;</a>
                <input 
                    v-model.lazy="currentPage" 
                    @keyup.enter="displayData"
                    type="text" 
                    style="margin-bottom: 15px;width: 48px;text-align: center"> 
                {{totalValues && totalValues < resultsPerPage * 100 ? " / " + Math.ceil(totalValues/resultsPerPage) : ''}}
                <a v-if="!totalValues || currentPage < totalValues/resultsPerPage" @click="displayData('next')">&gt;</a>
            </div>
            <div><a :href="query">{{ websiteText.viewQuery||fallbackText.viewQuery }}</a></div>
            <div><a @click="exportAsFormat('csv')">Export as CSV</a></div>
            <div><a @click="exportAsFormat('json')">Export as JSON</a></div>
        </div>
    </div>`,
    methods: {
        sortSinglePageValues(arr){
            if (this.totalValues && this.totalValues <= resultsPerPage) {
                return [...arr].sort((a,b)=>(
                    a.valueLabel.value.toLowerCase()>b.valueLabel.value.toLowerCase()
                    ?1:-1
                ));
            }
            return arr
        },
        displayData(action = '') {
            this.items = []
            // Determine page change action
            if (action == 'back') {
                if (this.currentPage > 1) {
                    this.currentPage--;
                }
            }
            else if (action == 'next') {
                if (!this.totalValues || this.currentPage < this.totalValues / resultsPerPage) {
                    this.currentPage++;
                }
            }
            /* 
             Gets items based on applied filters.
             In case of item has multiple values for quantity, 
             max value is considered.
             If number of items is too high fetch limited items
             at a time based on the current page number.
             Sort only in case of single page results.
            */
            var filterString = this.sparqlParameters[0];
            var filterRanges = this.sparqlParameters[1];
            var filterQuantities = this.sparqlParameters[2];
            var noValueString = this.sparqlParameters[3];
            var maxString = this.sparqlParameters[4];
            var constraintString = this.sparqlParameters[5];
            var outerFileVar = '';
            var innerFileVar = '';
            if ( showThumbnails ) {
                outerFileVar = '?file';
                // These two variables depend on whether there's a "GROUP BY".
                innerFileVar = maxString == "" ? "?file" : "(MAX(?fil) AS ?file)";
                this.classSelector = maxString == "" ? "?value schema:url ?file" : "?value schema:url $fil";
            }

            var offset = (this.currentPage - 1) * resultsPerPage;
            // If it's specified to be a "very large class" (which hopefully
            // doesn't apply to anything with less than 50,000 items), and no
            // filters have been applied, add a random offset to the query, so
            // that the same items aren't shown every time a user goes to that
            // class.
            // (This will mean that the user will never see the first X items
            // if they just scroll through all the items, but then again
            // there's probably no way they will scroll through everything.)
            if ( veryLargeClasses.includes(this.classValue) && this.appliedFilters.length == 0 && this.appliedRanges.length == 0 && this.appliedQuantities.length == 0  ) {
                if ( !this.additionalOffset ) {
                    this.additionalOffset = Math.floor(Math.random() * 50000);
                }
                offset = offset + this.additionalOffset;
            }
            sparqlQuery = "SELECT DISTINCT ?value ?valueLabel " + outerFileVar + " WHERE {\n" +
                "{\n" +
                "SELECT ?value " + innerFileVar + " " + maxString + " WHERE {\n" +
                this.classSelector +
                filterString +
                filterRanges +
                filterQuantities +
                noValueString +
                "}\n" +
                (maxString == "" ? "" : "GROUP BY ?value \n") +
                (constraintString == "" ? "LIMIT " + resultsPerPage + " OFFSET " + offset : "") +
                "}\n" +
                constraintString +
                "SERVICE wikibase:label { bd:serviceParam wikibase:language \"" + lang + "\". }\n" +
                "}\n" +
                (constraintString != "" ? "LIMIT " + resultsPerPage + " OFFSET " + offset : "");
            this.query = queryServiceWebsiteURL + encodeURIComponent(sparqlQuery);
            fullUrl = sparqlEndpoint + encodeURIComponent(sparqlQuery);
            axios.get(fullUrl)
                .then(response => {
                    if (response.data['results']['bindings'].length) {
                        this.items = [...response.data['results']['bindings']]
                        if ( showThumbnails ) {
                            this.addFileInformationToItems();
                        }
                    }
                    else {
                        this.items.push({ value: "Empty" })
                    }
                })
                .catch(_error => {
                    this.items.push({ value: "Error" })
                })
        },
        pathForFilter(filter) {
            return window.location.href + '&cf=' + filter.value.value.split('/').slice(-1)[0];
        },
        changePage(page) {
            this.$emit('change-page', page)
        },
        removeFilter(value) {
            this.$emit("remove-filter", value, 'view-all-items');
        },
        removeRange(range) {
            this.$emit("remove-range", range, 'view-all-items');
        },
        removeQuantity(quantity) {
            this.$emit("remove-quantity", quantity, 'view-all-items');
        },
        showFilter(filter) {
            this.$emit('update-filter', filter)
        },
        linkToActualItem(item) {
            return itemURLStart + item.split('/').slice(-1)[0] + "?uselang=" + (urlParams.get('lang') ? urlParams.get('lang') : (defaultLanguages[0] ? defaultLanguages[0] : 'en'))
        },
        linkToFilePage(item) {
            return fileURLStart + item.split('/').slice(-1)[0].replaceAll('%20', '_') + "?uselang=" +
                (urlParams.get('lang') ? urlParams.get('lang') : (defaultLanguages[0] ? defaultLanguages[0] : 'en'));
        },
        addFileInformationToItems() {
            for ( i = 0; i < this.items.length; i++ ) {
                var fileName = decodeURIComponent( this.items[i].file.value.substring(51) ); // Remove URL stuff
                var fileSuffix = fileName.substring(fileName.length - 4).toLowerCase();
                var isImage = [ '.gif', '.jpg', 'jpeg', '.png', 'webp' ].includes( fileSuffix );
                var isVideo = [ '.mpg', '.ogv',  'webm' ].includes( fileSuffix );
                var notImageButHasThumbnail = isVideo || [ 'djvu', '.pdf', '.stl', '.svg', '.tif', 'tiff' ].includes( fileSuffix );
                var isAudio = [ 'flac', '.mid', '.mp3', '.oga', '.ogg', 'opus', '.wav' ].includes( fileSuffix );
                if ( isImage || notImageButHasThumbnail ) {
                        // We could use the API to get the thumbnail image for
                        // each file, but it's easier (and faster) to just
                        // figure it out ourselves, based on the MD5 hash of
                        // the filename, plus the file extension. If the
                        // hashing code, or algorithm, ever change on Commons,
                        // this code will break.
                        // Note that the MD5 library matters - the function
                        // being used here is from a Wikimedia script. Other
                        // MD5 JS libraries handle non-ASCII characters in
                        // filenames differently, for some reason, thus
                        // returning the "wrong" hash for those filenames.
                        var fileNameWithUnderscores = fileName.replace(/ /g, '_');
                        var md5Hash = hex_md5(fileNameWithUnderscores);
                        var firstCharacter = md5Hash.substring(0, 1);
                        var firstTwoCharacters = md5Hash.substring(0, 2);
                        this.items[i].thumbnailURL = thumbnailURLStart + firstCharacter + '/' + firstTwoCharacters +
                                '/' + encodeURIComponent(fileNameWithUnderscores) + '/' + '150px-' +
                                encodeURIComponent(fileNameWithUnderscores) + (notImageButHasThumbnail ? '.jpg' : '');
                }
                if ( itemURLStart + this.items[i].valueLabel.value == this.items[i].value.value ) {
                        this.items[i].caption = fileName;
                        this.items[i].overlay = fileName;
                } else {
                        this.items[i].caption = this.items[i].valueLabel.value;
                        this.items[i].overlay = this.items[i].valueLabel.value + ' (' + fileName + ')';
                }
                if ( (isImage || notImageButHasThumbnail) && this.items[i].caption.length > 60 ) {
                        this.items[i].caption = this.items[i].caption.substring(0, 60) + '...';
                }
                if ( isAudio ) {
                        this.items[i].icon = '&#127925;';
                }
                if ( isVideo ) {
                        this.items[i].icon = '&#127909;';
                }
            }
        },
        exportAsFormat(format) {
            document.getElementsByTagName("body")[0].style.cursor = "progress";
            /* 
             Gets items based on applied filters.
             In case of item has multiple values for quantity, 
             max value is considered.
            */
            var sparqlQuery = "SELECT DISTINCT ?value ?valueLabel WHERE {\n" +
                "{\n" +
                "SELECT ?value  " + this.sparqlParameters[4] + " WHERE {\n" +
                this.classSelector +
                this.sparqlParameters[0] +
                this.sparqlParameters[1] +
                this.sparqlParameters[2] +
                this.sparqlParameters[3] +
                "} \n" +
                (this.sparqlParameters[4] == "" ? "" : "GROUP BY ?value \n") +
                "LIMIT 100000\n" +
                "}\n" +
                this.sparqlParameters[5] +
                "SERVICE wikibase:label { bd:serviceParam wikibase:language \"" + lang + "\". }\n" +
                "}\n" +
                "ORDER BY ?valueLabel\n";
            var fullUrl = sparqlEndpoint + encodeURIComponent(sparqlQuery);
            axios.get(fullUrl)
                .then(response => {
                    if (response.data['results']['bindings'].length) {
                        // Generate content in the desired format and load it in a temporary <a> tag and the click it dynamically.
                        var link = document.createElement("a");
                        if(format == 'csv'){
                            var csvHeader = encodeURI("data:text/csv;charset=utf-8,");
                            var csvContent = [...response.data['results']['bindings']].map(e => e.value.value.split('/').slice(-1)[0] + "," + e.valueLabel.value).join("\n");
                            var downloadURI = csvHeader + encodeURIComponent(csvContent);
                            link.setAttribute("download", "data.csv");
                        }
                        else if(format=='json'){
                            var jsonHeader = encodeURI("data:text/json;charset=utf-8,");
                            var jsonContent = JSON.stringify(response.data['results']['bindings']);
                            var downloadURI = jsonHeader + encodeURIComponent(jsonContent);
                            link.setAttribute("download", "data.json");
                        }
                        link.setAttribute("href", downloadURI);
                        document.body.appendChild(link);
                        link.click();
                        document.getElementsByTagName("body")[0].style.cursor = "default";
                    }
                })
                .catch(_error => {
                    document.getElementsByTagName("body")[0].style.cursor = "default";
                    alert("Download failed");
                })
        }
    },
    mounted() {
        if (classlessFilters) {
            var classlessFiltersString = '';
            for ( filterNum = 0; filterNum < classlessFilters.length; filterNum++ ) {
                classlessFiltersString += 'wd:' + classlessFilters[filterNum] + ' ';
            }
            var sparqlQuery = "SELECT DISTINCT ?value ?valueLabel WHERE {\n" +
                "VALUES ?value { " + classlessFiltersString + " }\n" +
                "SERVICE wikibase:label { bd:serviceParam wikibase:language \"" + lang + "\" . }\n" +
                    "}";
        } else {
            // Check available filters and exclude ones with distinct type value constraint.
            var sparqlQuery = "SELECT DISTINCT ?value ?valueLabel ?property WHERE {\n" +
                "wd:" + this.classValue + " wdt:" + propertiesForThisType + " ?value .\n" +
                "?value wikibase:propertyType ?property .\n";
            if ( propertyConstraint && distinctValuesConstraint ) {
                sparqlQuery += "FILTER(NOT EXISTS {\n" +
                "?value p:" + propertyConstraint + " ?constraint_statement .\n" +
                "?constraint_statement ps:" + propertyConstraint + " wd:" + distinctValuesConstraint + " .\n" +
                "})\n";
            }
            sparqlQuery += "FILTER (?property in (wikibase:Time, wikibase:Quantity, wikibase:WikibaseItem, wikibase:String)) .\n" +
                "SERVICE wikibase:label { bd:serviceParam wikibase:language \"" + lang + "\". }\n" +
                "}\n" +
                "ORDER BY ?valueLabel";
        }
        var fullUrl = centralSPARQLEndpoint + encodeURIComponent(sparqlQuery);
        axios.get(fullUrl)
            .then(response => {
                if (response.data['results']['bindings']) {
                    this.filtersCount = response.data['results']['bindings'].length
                    this.filters = [...response.data['results']['bindings']]
                    this.filters.sort((a,b)=>(a.valueLabel.value.toLowerCase()<b.valueLabel.value.toLowerCase())?-1:1)
                }
                else {
                    this.filters.push({ value: "Empty", valueLabel: "No data" })
                }
            })
            .catch(_error => {
                this.items.push({ value: "Error" })
            })

        if ( noClasses ) {
            this.classSelector = '';
        } else {
            // Find items both in this class and in any of its subclasses.
            this.classSelector = "{\n" +
                "    ?value wdt:" + instanceOf + " wd:" + this.classValue + "\n" +
                "} UNION {\n" +
                "    ?value wdt:" + instanceOf + " ?subclass .\n" +
                "    ?subclass wdt:" + subclassOf + " wd:" + this.classValue + "\n" +
                "}\n";
        }
        if ( showThumbnails ) {
            this.classSelector += "?value schema:url ?file\n";
        }

        if ( mainPageText && this.appliedFilters.length == 0 && this.appliedRanges.length == 0 && this.appliedQuantities.length == 0 ) {
                this.items = [];
                this.items.push({ value: 'Error' });
                this.websiteText.displayItemsError = mainPageText;
                this.websiteText.viewQuery = '';
                return;
        }

        // Change applied filters/ranges/quantities to SPARQL equivalents
        let filterString = "";
        let parentFilterString = "";
        let noValueString = "";
        for (let i = 0; i < this.appliedFilters.length; i++) {
            if (this.appliedFilters[i].parentFilterValue) {
                if (centralSPARQLService) {
                    filterString += "?value wdt:" + this.appliedFilters[i].parentFilterValue + " ?temp" + i + " .\n";
                    parentFilterString += "?temp" + i + " wdt:" + this.appliedFilters[i].filterValue + " wd:" + this.appliedFilters[i].value + " .\n";
                } else {
                    filterString += "{#filter " + i + "\n" +
                        "?value wdt:" + this.appliedFilters[i].parentFilterValue + " ?temp" + i + " .\n" +
                        "?temp" + i + " wdt:" + this.appliedFilters[i].filterValue + " wd:" + this.appliedFilters[i].value + " .\n" +
                        "}\n";
                }
            }
            else if (this.appliedFilters[i].value == "novalue") {
                noValueString += "{#filter " + i + "\n FILTER(NOT EXISTS { ?value wdt:" + this.appliedFilters[i].filterValue + " ?no. }) .\n}"
            }
            else if (this.appliedFilters[i].value.match(/^Q\d+$/) == null) {
                // String type
                filterString += "{#filter " + i + "\n?value wdt:" + this.appliedFilters[i].filterValue + " '" + this.appliedFilters[i].value + "' .\n}";
            }
            else {
                filterString += "{#filter " + i + "\n?value wdt:" + this.appliedFilters[i].filterValue + " wd:" + this.appliedFilters[i].value + " .\n}";
            }
        }
        if (parentFilterString != '') {
             filterString += "SERVICE <" + centralSPARQLService + "> {\n" + parentFilterString + "}\n";
        }
        let filterRanges = "", maxString = "", constraintString = "";
        for (let i = 0; i < this.appliedRanges.length; i++) {
            if (this.appliedRanges[i].valueLL == "novalue") {
                noValueString += "{#date range " + i + "\n FILTER(NOT EXISTS { ?value wdt:" + this.appliedRanges[i].filterValue + " ?no. }) .\n}"
            }
            else if (this.appliedRanges[i].parentFilterValue) {
                timePrecision = getTimePrecision(this.appliedRanges[i].valueLL, this.appliedRanges[i].valueUL)
                filterRanges += "{#date range " + i + "\n?value wdt:" + this.appliedRanges[i].parentFilterValue + " ?temp" + i + " .\n" +
                    "?temp" + i + " (p:" + this.appliedRanges[i].filterValue + "/psv:" + this.appliedRanges[i].filterValue + ") ?timenode" + i + ".\n" +
                    "?timenode" + i + " wikibase:timeValue ?time" + i + " .\n" +
                    "?timenode" + i + " wikibase:timePrecision ?timeprecision" + i + " .\n" +
                    (centralSPARQLService ? "}\n" : '') +
                    "FILTER(?timeprecision" + i + ">=" + timePrecision + ")\n}";
                constraintString += "FILTER('" + this.appliedRanges[i].valueLL + "'^^xsd:dateTime <= ?tim" + i + " && ?tim" + i + " < '" + this.appliedRanges[i].valueUL + "'^^xsd:dateTime) .\n";
                maxString += "(MAX(?time" + i + ") AS ?tim" + i + ") ";

            }
            else {
                timePrecision = getTimePrecision(this.appliedRanges[i].valueLL, this.appliedRanges[i].valueUL)
                filterRanges += "{#date range " + i + "\n?value (p:" + this.appliedRanges[i].filterValue + "/psv:" + this.appliedRanges[i].filterValue + ") ?timenode" + i + " .\n" +
                    "?timenode" + i + " wikibase:timeValue ?time" + i + " .\n" +
                    "?timenode" + i + " wikibase:timePrecision ?timeprecision" + i + " .\n" +
                    "FILTER(?timeprecision" + i + ">=" + timePrecision + ") .\n" +
                    "FILTER('" + this.appliedRanges[i].valueLL + "'^^xsd:dateTime <= ?time" + i + " && ?time" + i + " < '" + this.appliedRanges[i].valueUL + "'^^xsd:dateTime). \n" +
                    "}\n";
                // It would probably be better to group by date here, but unfortunately that makes
                // the queries too slow in some cases.
                // constraintString += "FILTER('" + this.appliedRanges[i].valueLL + "'^^xsd:dateTime <= ?tim" + i + " && ?tim" + i + " < '" + this.appliedRanges[i].valueUL + "'^^xsd:dateTime) .\n";
                // maxString += "(MAX(?time" + i + ") AS ?tim" + i + ") ";
            }
        }
        let filterQuantities = "";
        for (let i = 0; i < this.appliedQuantities.length; i++) {
            if (this.appliedQuantities[i].parentFilterValue) {
                if (this.appliedQuantities[i].valueLL == "novalue") {
                    noValueString += "{#quantity range " + i + "\n FILTER(NOT EXISTS { ?value wdt:" + this.appliedQuantities[i].filterValue + " ?no. }) .\n}"
                }
                else if (this.appliedQuantities[i].unit == "") {
                    filterQuantities += "{#quantity range " + i + "\n?value wdt:" + this.appliedQuantities[i].parentFilterValue + " ?temp" + i + " .\n" +
                        (centralSPARQLService ? "SERVICE <" + centralSPARQLService + "> {\n" : '') +
                        "?temp" + i + " (p:" + this.appliedQuantities[i].filterValue + "/psv:" + this.appliedQuantities[i].filterValue + ") ?amount" + i + " .\n" +
                        "  ?amount" + i + " wikibase:quantityAmount ?amountValue" + i + " .\n}" +
                        (centralSPARQLService ? "}\n" : '');
                    constraintString += "FILTER(" + this.appliedQuantities[i].valueUL + " >= ?qua" + i + " && ?qua" + i + " >=" + this.appliedQuantities[i].valueLL + ")\n";
                    maxString += "(MAX(?amountValue" + i + ") AS ?qua" + i + ") ";
                }
                else {
                    filterQuantities += "{#quantity range " + i + "\n?value wdt:" + this.appliedQuantities[i].parentFilterValue + " ?temp" + i + " .\n" +
                        (centralSPARQLService ? "SERVICE <" + centralSPARQLService + "> {\n" : '') +
                        "?temp" + i + " (p:" + this.appliedQuantities[i].filterValue + "/psn:" + this.appliedQuantities[i].filterValue + ") ?amount" + i + " .\n" +
                        "  ?amount" + i + " wikibase:quantityAmount ?amountValue" + i + " .\n}" +
                        (centralSPARQLService ? "}\n" : '');
                    constraintString += "FILTER(" + this.appliedQuantities[i].valueUL + " >= ?qua" + i + " && ?qua" + i + " >=" + this.appliedQuantities[i].valueLL + ")\n";
                    maxString += "(MAX(?amountValue" + i + ") AS ?qua" + i + ") ";
                }
            }
            else {
                if (this.appliedQuantities[i].valueLL == "novalue") {
                    noValueString += "{#quantity range " + i + "\n FILTER(NOT EXISTS { ?value wdt:" + this.appliedQuantities[i].filterValue + " ?no. }) .\n}"
                }
                else if (this.appliedQuantities[i].unit == "") {
                    filterQuantities += "{#quantity range " + i + "\n?value (p:" + this.appliedQuantities[i].filterValue + "/psv:" + this.appliedQuantities[i].filterValue + ") ?amount" + i + " .\n" +
                        "  ?amount" + i + " wikibase:quantityAmount ?amountValue" + i + " .\n}";
                    constraintString += "FILTER(" + this.appliedQuantities[i].valueUL + " >= ?qua" + i + " && ?qua" + i + " >=" + this.appliedQuantities[i].valueLL + ")\n";
                    maxString += "(MAX(?amountValue" + i + ") AS ?qua" + i + ") ";
                }
                else {
                    filterQuantities += "{#quantity range " + i + "\n?value (p:" + this.appliedQuantities[i].filterValue + "/psn:" + this.appliedQuantities[i].filterValue + ") ?amount" + i + " .\n" +
                        "  ?amount" + i + " wikibase:quantityAmount ?amountValue" + i + " .\n}";
                    constraintString += "FILTER(" + this.appliedQuantities[i].valueUL + ">=?qua" + i + " && ?qua" + i + ">=" + this.appliedQuantities[i].valueLL + ")\n";
                    maxString += "(MAX(?amountValue" + i + ") AS ?qua" + i + ") ";
                }
            }
        }
        this.sparqlParameters.push(filterString, filterRanges, filterQuantities, noValueString, maxString, constraintString);
        if (this.format) {
            this.exportAsFormat(this.format);
        }
        else {
            this.displayData();
        }
    }
})
