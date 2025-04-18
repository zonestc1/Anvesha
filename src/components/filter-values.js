filtervalues = Vue.component('filter-values', {
    props: ['websiteText', 'fallbackText', 'classValue', 'classLabel', 'currentFilter', 'totalValues', 'appliedFilters', 'appliedRanges', 'appliedQuantities', 'format'],
    data() {
        return {
            items: [],
            itemsType: '',
            fullPropertyValues: [],
            displayCount: 1,
            currentPage: 1,
            filterProperty: '',
            filterValue: '',
            searchResults: '',
            query: '#',
            noValueURL: '',
            secondaryFilters:[],
            secondaryFiltersCount: -1,
            secondaryFiltersDropdownDisplay: false
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
            @change-page="changePage"
        >
        </header-view>
        <div class="content">
            <div v-if="secondaryFiltersCount>0" class="property-filter-box">
                <div class="info">
                    <div style="cursor:pointer;display:flex;justifyContent:space-between;alignItems:baseline"  @click="toggleDropdown">
                        <span v-html="displayMessage(websiteText.applyLinkedFilter||fallbackText.applyLinkedFilter, currentFilter.valueLabel)"></span>
                        <img v-bind:style="{ transform:'rotate('+ secondaryFiltersDropdownDisplay*90 + 'deg)' }" src="images/side-arrow.svg" height="14px">
                    </div>
                    <p v-if="secondaryFiltersDropdownDisplay">{{ websiteText.chooseLinkedFilter||fallbackText.chooseLinkedFilter }}</p>
                </div>
                <ul class="secondary-filter" v-bind:style="{ display: (secondaryFiltersDropdownDisplay?'block':'none') }">
                    <li v-for="(cls,clsLabel) in secondaryFilters">
                        <b>
                            <span v-if="window.noClasses">
                                {{clsLabel}}:
                            </span>
                            <a v-else
                                :href="linkToClass(cls)"
                                @click.exact="updateClass(cls)"
                                onclick="return false;"> 
                                {{clsLabel}}:
                            </a>
                        </b>
                        <span v-for="filter in cls">
                            <a 
                                @click.exact="showSecondaryFilter(filter)"
                                onclick="return false;"> 
                                {{filter.valueLabel.value}}
                            </a>
                            <b v-if="cls[cls.length-1].valueLabel.value != filter.valueLabel.value">&middot; </b>
                        </span>
                    </li>
                </ul>
            </div>
            <div v-if="itemsType=='' || itemsType=='ItemLoading'">
                <a @click="changePage('view-all-items')">{{ viewItemsText() }}</a>
                <p v-html="displayMessage(websiteText.gettingValues||fallbackText.gettingValues, currentFilter.valueLabel)"></p>
                <div v-if="itemsType=='ItemLoading'" class="filterValueInputWrapper">
                    <p v-html="websiteText.customFilterValue||fallbackText.customFilterValue"></p>
                    <div class="filterValueInput">
                        <input
                            v-model="filterValue"
                            @input="showFilterValues"
                            type="search"
                            :placeholder='websiteText.filterValuePlaceholder||fallbackText.filterValuePlaceholder'>
                    </div>
                    <div v-if="filterValue.length>0" class="searchOptions">
                        <a
                            class="searchOption"
                            v-for="searchResult in searchResults"
                            @click="submitFreeFormFilterValue(searchResult)">
                                <b>
                                    {{ searchResult.label.replace(/^./, searchResult.label[0].toUpperCase()) }}
                                </b>
                                : {{ searchResult.description }}
                        </a>
                    </div>
                </div>
                <img src='images/loading.gif'>
            </div>
            <div v-else-if="itemsType=='Additionalempty'">
                <a @click="changePage('view-all-items')">{{ viewItemsText() }}</a>
                <p v-html="displayMessage(websiteText.noAdditionalValues||fallbackText.noAdditionalValues, currentFilter.valueLabel)"></p>
            </div>
            <div v-else-if="itemsType=='Error'">
                <a @click="changePage('view-all-items')">{{ viewItemsText() }}</a>
                <p v-html="displayMessage(websiteText.filterError||fallbackText.filterError, currentFilter.valueLabel)"></p>
            </div>
            <div v-else>
                <div v-if="itemsType=='Item' || itemsType=='String'">
                    <p v-if="totalValues" v-html="displayPluralCount(websiteText.itemCount||fallbackText.itemCount, totalValues, true)"></p>
                    <a @click="changePage('view-all-items')">{{ viewItemsText() }}</a>
                    <p v-if="appliedFilters.findIndex(filter => filter.filterValue == currentFilter.value) != -1" v-html="displayMessage(websiteText.selectAdditionalValue||fallbackText.selectAdditionalValue, currentFilter.valueLabel)"></p>
                    <p v-else v-html="displayMessage(websiteText.selectValue||fallbackText.selectValue, currentFilter.valueLabel)"></p>
                    <div v-if="items.length > 150" class="filterValueInputWrapper">
                        <p v-html="websiteText.customFilterValue||fallbackText.customFilterValue"></p>
                        <div class="filterValueInput">
                            <input
                                v-model="filterValue"
                                @input="showFilterValues"
                                type="search"
                                :placeholder='websiteText.filterValuePlaceholder||fallbackText.filterValuePlaceholder'>
                        </div>
                        <div v-if="filterValue.length>0" class="searchOptions">
                            <a
                                class="searchOption"
                                v-for="searchResult in searchResults"
                                @click="submitFreeFormFilterValue(searchResult)">
                                    <b>
                                        {{ searchResult.label.replace(/^./, searchResult.label[0].toUpperCase()) }}
                                    </b>
                                    : {{ searchResult.description }}
                            </a>
                        </div>
                    </div>
                    <div v-if="items.length>resultsPerPage && (itemsType=='Item' || itemsType=='String')" style="text-align: center">
                        <a v-if="currentPage > 1" @click="goToPreviousPage()">&lt;</a>
                        <input
                            v-model.lazy="currentPage"
                            @change="pageChanged($event)"
                            type="text"
                            style="margin-bottom: 15px;width: 48px;text-align: center">
                        {{items.length < 1000000 ? " / " + Math.ceil(items.length/resultsPerPage) : ''}}
                        <a v-if="currentPage < items.length/resultsPerPage" @click="goToNextPage()">&gt;</a>
                    </div>
                    <ul>
                        <li v-if="appliedFilters.findIndex(filter => filter.filterValue == currentFilter.value) ==-1">
                            <i>
                                <a 
                                    :href="noValueURL" 
                                    onclick="return false;" 
                                    @click.exact="applyFilter('novalue')" 
                                    @click.ctrl="window.open(noValueURL, '_blank')">
                                    {{ websiteText.noValue||fallbackText.noValue }}
                                </a>
                            </i>
                        </li>
                        <li v-for="(item,index) in items" v-if="index < currentPage*resultsPerPage && index >= (currentPage-1)*resultsPerPage">
                            <a 
                                :href="item.href" 
                                onclick="return false;" 
                                @click.exact="applyFilter(item)" 
                                @click.ctrl="window.open(item.href, '_blank')">
                                {{item.valueLabel.value}}
                            </a> 
                            <span class="result-count">
                                {{ displayPluralCount(websiteText.results||fallbackText.results, item.count.value, false) }}
                            <span>
                        </li>
                    </ul>
                </div>
                <div v-else-if="itemsType=='ItemFail'">
                    <p><i v-html="displayMessage(websiteText.filterTimeout||fallbackText.filterTimeout, currentFilter.valueLabel)"></i></p>
                    <a @click="changePage('view-all-items')">{{ viewItemsText() }}</a>
                    <p v-html="displayMessage(websiteText.selectValue||fallbackText.selectValue, currentFilter.valueLabel)"></p>
                    <div class="filterValueInputWrapper">
                        <p v-html="websiteText.customFilterValue||fallbackText.customFilterValue"></p>
                        <div class="filterValueInput">
                            <input
                                v-model="filterValue"
                                @input="showFilterValues"
                                style="border: none;outline: none;width: 100%;font-size:1em"
                                type="search"
                                :placeholder='websiteText.filterValuePlaceholder||fallbackText.filterValuePlaceholder'>
                        </div>
                        <div v-if="filterValue.length>0" class="searchOptions">
                            <a
                                class="searchOption"
                                v-for="searchResult in searchResults"
                                @click="submitFreeFormFilterValue(searchResult)">
                                    <b>
                                        {{ searchResult.label.replace(/^./, searchResult.label[0].toUpperCase()) }}
                                    </b>
                                    : {{ searchResult.description }}
                            </a>
                        </div>
                    </div>
                    <ul>
                        <li>
                            <i>
                                <a 
                                :href="noValueURL" 
                                onclick="return false;" 
                                @click.exact="applyFilter('novalue')" 
                                @click.ctrl="window.open(noValueURL, '_blank')">
                                {{ websiteText.noValue||fallbackText.noValue }}
                            </i>
                        </li>
                        <li v-for="item in items">
                            <a 
                                :href="item.href" 
                                onclick="return false;" 
                                @click.exact="applyFilter(item)" 
                                @click.ctrl="window.open(item.href, '_blank')">
                                {{item.valueLabel.value}}
                            </a>
                        </li>
                    </ul>
                </div>
                <div v-else-if="itemsType=='Time'">
                    <p v-if="totalValues" v-html="displayPluralCount(websiteText.itemCount||fallbackText.itemCount, totalValues, true)"></p>
                    <a @click="changePage('view-all-items')">{{ viewItemsText() }}</a>
                    <p v-html="displayMessage(websiteText.selectValue||fallbackText.selectValue, currentFilter.valueLabel)"></p>
                    <ul v-if="displayCount == 1">
                        <li v-if="appliedRanges.findIndex(filter => filter.filterValue == currentFilter.value) ==-1">
                            <i>
                                <a 
                                    :href="noValueURL" 
                                    onclick="return false;" 
                                    @click.exact="applyRange('novalue')" 
                                    @click.ctrl="window.open(noValueURL, '_blank')">
                                    {{ websiteText.noValue||fallbackText.noValue }}
                                </a>
                            </i>
                        </li>
                        <li v-for="item in items" v-if="item.numValues>0">
                            <a 
                                :href="item.href" 
                                onclick="return false;" 
                                @click.exact="applyRange(item)" 
                                @click.ctrl="window.open(item.href, '_blank')">
                                {{item.bucketName}} 
                            </a> 
                            <span class="result-count">
                                {{ displayPluralCount(websiteText.results||fallbackText.results, item.numValues, false) }}
                            <span>
                        </li>
                    </ul>
                    <ul v-if="displayCount == 0">
                        <li>
                            <i>
                                <a 
                                    :href="noValueURL" 
                                    onclick="return false;" 
                                    @click.exact="applyFilter('novalue')" 
                                    @click.ctrl="window.open(noValueURL, '_blank')">
                                    {{ websiteText.noValue||fallbackText.noValue }}
                                </a>
                            </i>
                        </li>
                        <li v-for="item in items">
                            <a 
                                :href="item.href" 
                                onclick="return false;" 
                                @click.exact="applyRange(item)" 
                                @click.ctrl="window.open(item.href, '_blank')">
                                {{item.bucketName}} 
                            </a>
                        </li>
                    </ul>
                </div>
                <div v-else-if="itemsType=='TimeFail'">
                    <p><i v-html="displayMessage(websiteText.filterTimeout||fallbackText.filterTimeout, currentFilter.valueLabel)"></i></p>
                    <a @click="changePage('view-all-items')">{{ viewItemsText() }}</a>
                    <p v-html="displayMessage(websiteText.selectValue||fallbackText.selectValue, currentFilter.valueLabel)"></p>
                    <ul>
                        <li>
                            <i>
                                <a 
                                    :href="noValueURL" 
                                    onclick="return false;" 
                                    @click.exact="applyFilter('novalue')" 
                                    @click.ctrl="window.open(noValueURL, '_blank')">
                                    {{ websiteText.noValue||fallbackText.noValue }}
                                </a>
                                </i>
                            </li>
                        <li v-for="item in items">
                            <a 
                                :href="item.href" 
                                onclick="return false;" 
                                @click.exact="applyRange(item)" 
                                @click.ctrl="window.open(item.href, '_blank')">
                                {{item.bucketName}} 
                            </a>
                        </li>
                    </ul>
                </div>
                <div v-else-if="itemsType=='Quantity'">
                    <p v-if="displayCount == 1 && totalValues" v-html="displayPluralCount(websiteText.itemCount||fallbackText.itemCount, totalValues, true)"></p>
                    <p v-if="displayCount == 0"><i v-html="displayMessage(websiteText.filterTimeout||fallbackText.filterTimeout, currentFilter.valueLabel)"></i></p>
                    <a @click="changePage('view-all-items')">{{ viewItemsText() }}</a>
                    <p v-html="displayMessage(websiteText.selectValue||fallbackText.selectValue, currentFilter.valueLabel)"></p>
                    <ul v-if="displayCount == 1">
                        <li v-if="appliedQuantities.findIndex(filter => filter.filterValue == currentFilter.value) ==-1">
                            <i>
                                <a 
                                    :href="noValueURL" 
                                    onclick="return false;" 
                                    @click.exact="applyQuantityRange('novalue')" 
                                    @click.ctrl="window.open(noValueURL, '_blank')">
                                    {{ websiteText.noValue||fallbackText.noValue }}
                                </a>
                            </i>
                        </li>
                        <li v-for="item in items" v-if="item.numValues>0">
                            <a 
                                :href="item.href" 
                                onclick="return false;" 
                                @click.exact="applyQuantityRange(item)" 
                                @click.ctrl="window.open(item.href, '_blank')">
                                {{item.bucketName}} {{item.unit}} 
                            </a> 
                            <span class="result-count">
                                {{ displayPluralCount(websiteText.results||fallbackText.results, item.numValues, false) }}
                            <span>
                        </li>
                    </ul>
                    <ul v-if="displayCount == 0">
                        <li>
                            <i>
                                <a 
                                    :href="noValueURL" 
                                    onclick="return false;" 
                                    @click.exact="applyQuantityRange('novalue')" 
                                    @click.ctrl="window.open(noValueURL, '_blank')">
                                    {{ websiteText.noValue||fallbackText.noValue }}
                                </a>
                            </i>
                        </li>
                        <li v-for="item in items">
                            <a 
                                :href="item.href" 
                                onclick="return false;" 
                                @click.exact="applyQuantityRange(item)" 
                                @click.ctrl="window.open(item.href, '_blank')">
                                {{item.bucketName}} 
                            </a>
                        </li>
                    </ul>
                </div>
                <div v-else-if="itemsType=='QuantityFail'">
                    <p><i v-html="displayMessage(websiteText.filterTimeout||fallbackText.filterTimeout, currentFilter.valueLabel)"></i></p>
                    <a @click="changePage('view-all-items')">{{ viewItemsText() }}</a>
                    <p v-html="displayMessage(websiteText.selectValue||fallbackText.selectValue, currentFilter.valueLabel)"></p>
                    <ul>
                        <li>
                            <i>
                                <a
                                    :href="noValueURL"
                                    onclick="return false;"
                                    @click.exact="applyFilter('novalue')"
                                    @click.ctrl="window.open(noValueURL, '_blank')">
                                    {{ websiteText.noValue||fallbackText.noValue }}
                                </a>
                                </i>
                            </li>
                        <li v-for="item in items">
                            <a
                                :href="item.href"
                                onclick="return false;"
                                @click.exact="applyQuantityRange(item)"
                                @click.ctrl="window.open(item.href, '_blank')">
                                {{item.bucketName}}
                            </a>
                        </li>
                    </ul>
                </div>
                <div v-if="items.length>resultsPerPage && (itemsType=='Item' || itemsType=='String')" style="text-align: center">
                    <a v-if="currentPage > 1" @click="goToPreviousPage()">&lt;</a>
                    <input
                        v-model.lazy="currentPage"
                        @change="pageChanged($event)"
                        type="text"
                        style="margin-bottom: 15px;width: 48px;text-align: center">
                    {{items.length < 1000000 ? " / " + Math.ceil(items.length/resultsPerPage) : ''}}
                    <a v-if="currentPage < items.length/resultsPerPage" @click="goToNextPage()">&gt;</a>
                </div>
                <div><a @click="exportCSV">Export as CSV</a></div>
            </div>
            <div><a :href="query">{{ websiteText.viewQuery||fallbackText.viewQuery }}</a></div>
        </div>
    </div>`,
    methods: {
        toggleDropdown() {
            this.secondaryFiltersDropdownDisplay = (this.secondaryFiltersDropdownDisplay == false) ? true : false;
        },
        changePage(page) {
            this.$emit('change-page', page)
        },
        showSecondaryFilter(filter) {
            this.$emit('update-secondary', filter)
        },
        linkToClass(cls){
            return window.location.pathname + "?c=" + cls[0].class.value.split('/').slice(-1)[0]
        },
        updateClass(cls) {
            this.$emit('update-class', cls[0].class.value.split('/').slice(-1)[0], cls[0].class.value.split('/').slice(-1)[0])
        },
        displayMessage(message, value) {
            if (message) {
                return message.replace("$1", "<b>" + value + "</b>");
            }
        },
        viewItemsText() {
            // Show "Back to main page" for link text if there have been
            // no filters applied, and there's text on the main page - i.e.,
            // there is no list to view.
            if ( window.mainPageText && this.appliedFilters.length == 0 && this.appliedRanges.length == 0 && this.appliedQuantities.length == 0 ) {
                return this.websiteText.backToMain || this.fallbackText.backToMain;
            } else {
                return this.websiteText.viewList || this.fallbackText.viewList;
            }
        },
        applyFilter(filter) {
            this.$emit('apply-filter', filter);
        },
        applyRange(range) {
            this.$emit('apply-range', range);
        },
        applyQuantityRange(range) {
            this.$emit('apply-quantity', range);
        },
        removeFilter(value) {
            this.$emit("remove-filter", value, 'filter-values');
        },
        removeRange(range) {
            this.$emit("remove-range", range, 'filter-values');
        },
        removeQuantity(quantity) {
            this.$emit("remove-quantity", quantity, 'filter-values');
        },
        exportCSV() {
            document.getElementsByTagName("body")[0].style.cursor = "progress";
            let csvHeader = encodeURI("data:text/csv;charset=utf-8,");
            if (this.itemsType == 'Item' || this.itemsType == 'ItemFail') {
                var csvContent = this.items.map(e => e.value.value.split('/').slice(-1)[0] + "," + `\"${e.valueLabel.value}\"` + (this.displayCount == 1 ? "," + e.count.value : '')).join("\n");
            }
            else if (this.itemsType == 'Time' || this.itemsType == 'TimeFail') {
                var csvContent = this.items.map(e => `\"${e.bucketName}\" ` + (this.displayCount == 1 ? "," + e.numValues : '')).join("\n");
            }
            else if (this.itemsType == 'Quantity' || this.itemsType == 'QuantityFail') {
                var csvContent = this.items.map(e => `\"${e.bucketName}\" ` + e.unit + (this.displayCount == 1 ? "," + e.numValues : '')).join("\n");
            }
            else if (this.itemsType == 'String' || this.itemsType == 'StringFail') {
                var csvContent = this.items.map(e => e.value.value + "," + `\"${e.valueLabel.value}\"` + (this.displayCount == 1 ? "," + e.count.value : '')).join("\n");
            }
            let downloadURI = csvHeader + encodeURIComponent(csvContent);
            var link = document.createElement("a");
            link.setAttribute("href", downloadURI);
            link.setAttribute("download", "data.csv");
            document.body.appendChild(link);
            link.click();
            document.getElementsByTagName("body")[0].style.cursor = "default";
        },
        showFilterValues() {
            if (this.filterValue.length > 0) {
                const fullURL = entityAPIURL + '?action=wbsearchentities&origin=*&format=json&language=' +
                        lang.split(",")[0] + '&uselang=' + lang.split(",")[0] +
                        '&type=item&search=' + this.filterValue;
                axios.get(fullURL)
                    .then(response => {
                        this.searchResults = [...response.data['search']]
                    })
            }
        },
        submitFreeFormFilterValue(searchResult) {
            var filter = {
                value: {
                        value: searchResult.url
                },
                valueLabel: {
                        value: searchResult.label
                }
            };
            this.$emit('apply-filter', filter);
        },
        pageChanged($event) {
            this.currentPage = parseInt(this.currentPage);
            if (!Number.isInteger(this.currentPage) || this.currentPage < 1) {
                this.currentPage = 1;
            }
            var numPages = Math.ceil(this.items.length / resultsPerPage);
            if (this.currentPage > numPages) {
                this.currentPage = numPages;
            }
            var queryString = window.location.search;
            cachedFilterValues[queryString]['currentPage'] = this.currentPage;
        },
        goToNextPage() {
            if (this.currentPage >= Math.ceil(this.items.length / resultsPerPage)) {
                return;
            }
            this.currentPage++;
            var queryString = window.location.search;
            cachedFilterValues[queryString]['currentPage'] = this.currentPage;
        },
        goToPreviousPage() {
            if (this.currentPage <= 1) {
                return;
            }
            this.currentPage--;
            var queryString = window.location.search;
            cachedFilterValues[queryString]['currentPage'] = this.currentPage;
        },
    },
    mounted() {
        // Escape if the user has been here before, and thus the set of
        // filter values has already been stored.
        var queryString = window.location.search;
        if ( cachedFilterValues.hasOwnProperty(queryString) ) {
            this.items = cachedFilterValues[queryString]['items'];
            this.itemsType = cachedFilterValues[queryString]['itemsType'];
            this.currentPage = cachedFilterValues[queryString]['currentPage'] ?? 1;
            this.secondaryFilters = cachedFilterValues[queryString]['secondaryFilters'] ?? {};
            this.secondaryFiltersCount = Object.keys(this.secondaryFilters).length;
            this.displayCount = 1;
            return;
        }

        /* 
         Get linked filters related to current filter using value type constraint.
         Exclude all filters with property types other than Time, Quantity and Item.
         Exclude all properties with distinct values constraint.
        */
        var sparqlQuery = "SELECT DISTINCT ?value ?valueLabel ?class ?classLabel ?property WHERE {\n" +
            "wd:" + this.currentFilter.value + " p:" + propertyConstraint + " ?constraint_statement .\n" +
            "?constraint_statement pq:" + classProperty + " ?class .\n" +
            "?constraint_statement ps:" + propertyConstraint +" wd:" + valueTypeConstraint + " .\n" +
            "?class wdt:" + propertiesForThisType + " ?value .\n" +
            "?value wikibase:propertyType ?property .\n";
        if (propertyConstraint && distinctValuesConstraint) {
            sparqlQuery += "FILTER(NOT EXISTS {\n" +
                "?value p:" + propertyConstraint + " ?constraint .\n" +
                "?constraint ps:" + propertyConstraint + " wd:" + distinctValuesConstraint + " .\n" +
                "})\n";
        }
        sparqlQuery += "FILTER (?property in (wikibase:Time, wikibase:Quantity, wikibase:WikibaseItem))\n" +
            "SERVICE wikibase:label { bd:serviceParam wikibase:language \"" + lang + "\". }\n" +
            "}" +
            "ORDER BY ?classLabel ?valueLabel";
        const url = centralSPARQLEndpoint + encodeURIComponent(sparqlQuery);
        axios.get(url)
            .then(response =>{
                var filtersByClass = {};
                if (response.data['results']['bindings']) {
                    var arr = response.data['results']['bindings'];
                    for (let i = 0; i < arr.length; i++) {
                        if (filtersByClass.hasOwnProperty(arr[i].classLabel.value)) {
                            filtersByClass[arr[i].classLabel.value].push(arr[i]);
                        }
                        else {
                            filtersByClass[arr[i].classLabel.value] = [arr[i]];
                        }
                    }
                    this.secondaryFilters = filtersByClass;
                    this.secondaryFiltersCount = Object.keys(this.secondaryFilters).length;
                }
                else {
                    this.secondaryFilters.push({ value: "Empty", valueLabel: "No data" });
                }
            });

        if ( noClasses ) {
            this.classSelector = '';
        } else {
            // Find items both in this class and in any of its subclasses.
            this.classSelector = "{\n" +
                "    ?item wdt:" + instanceOf + " wd:" + this.classValue + "\n" +
                "} UNION {\n" +
                "    ?item wdt:" + instanceOf + " ?subclass .\n" +
                "    ?subclass wdt:" + subclassOf + " wd:" + this.classValue + "\n" +
                "}\n";
        }

        // Convert the applied filters/time ranges/quantities into SPARQL equivalents
        var filterString = "";
        var parentFilterString = "";
        var noValueString = "";
        for (let i = 0; i < this.appliedFilters.length; i++) {
            if (this.appliedFilters[i].parentFilterValue) {
                if ( sparqlEndpoint == centralSPARQLEndpoint ) {
                    filterString += "{#filter " + i +"\n?item wdt:" + this.appliedFilters[i].parentFilterValue + " ?temp" + i + ".\n" +
                        "?temp" + i + " wdt:" + this.appliedFilters[i].filterValue + " wd:" + this.appliedFilters[i].value + ".\n}";
                } else {
                    filterString += "{#filter " + i +"\n?item wdt:" + this.appliedFilters[i].parentFilterValue + " ?temp" + i + ".\n}\n";
                    parentFilterString += "?temp" + i + " wdt:" + this.appliedFilters[i].filterValue + " wd:" + this.appliedFilters[i].value + ".\n";
                }
            }
            else if (this.appliedFilters[i].value == "novalue") {
                noValueString += "{#filter " + i +"\nFILTER(NOT EXISTS { ?value wdt:" + this.appliedFilters[i].filterValue + " ?no. }).\n}"
            }
            else if (this.appliedFilters[i].value.match(/^Q\d+$/) == null) {
                // "String" type
                filterString += "{#filter " + i + "\n?item wdt:" + this.appliedFilters[i].filterValue + " '" + this.appliedFilters[i].value + "' .\n}";
            }
            else {
                filterString += "{#filter " + i +"\n?item wdt:" + this.appliedFilters[i].filterValue + " wd:" + this.appliedFilters[i].value + ".\n}";
            }
        }
        if (parentFilterString != '' && centralSPARQLService) {
             parentFilterString = "SERVICE <" + centralSPARQLService + "> {\n" + parentFilterString + "\n}\n";
        }
        var filterRanges = ""
        timeString = "?item wdt:" + this.currentFilter.value + " ?time.\n";
        for (let i = 0; i < this.appliedRanges.length; i++) {
            if (this.appliedRanges[i].valueLL == "novalue") {
                noValueString += "{#date range " + i +"\n FILTER(NOT EXISTS { ?item wdt:" + this.appliedRanges[i].filterValue + " ?no. }).\n}"
            }
            else if (this.appliedRanges[i].parentFilterValue) {
                timePrecision = getTimePrecision(this.appliedRanges[i].valueLL, this.appliedRanges[i].valueUL, 1)
                filterRanges += "{#date range " + i + "\n?item wdt:" + this.appliedRanges[i].parentFilterValue+ " ?temp" + i + ".\n" +
                    "?temp" + i + " (p:" + this.appliedRanges[i].filterValue + "/psv:" + this.appliedRanges[i].filterValue + ") ?timenode" + i + ".\n" +
                    "?timenode" + i + " wikibase:timeValue ?time" + i + ".\n" +
                    "?timenode" + i + " wikibase:timePrecision ?timeprecision" + i + ".\n" +
                    "FILTER('" + this.appliedRanges[i].valueLL + "'^^xsd:dateTime <= ?time" + i + " && ?time" + i + " <= '" + this.appliedRanges[i].valueUL + "'^^xsd:dateTime).\n" +
                    "FILTER(?timeprecision" + i + ">=" + timePrecision + ")\n}";
            }
            else if (this.appliedRanges[i].filterValue != this.currentFilter.value) {
                timePrecision = getTimePrecision(this.appliedRanges[i].valueLL, this.appliedRanges[i].valueUL,1)
                filterRanges += "{#date range " + i +"\n?item (p:" + this.appliedRanges[i].filterValue + "/psv:" + this.appliedRanges[i].filterValue + ") ?timenode" + i + ".\n" +
                    "?timenode" + i + " wikibase:timeValue ?time" + i + ".\n" +
                    "?timenode" + i + " wikibase:timePrecision ?timeprecision" + i + ".\n" +
                    "FILTER('" + this.appliedRanges[i].valueLL + "'^^xsd:dateTime <= ?time" + i + " && ?time" + i + " <= '" + this.appliedRanges[i].valueUL + "'^^xsd:dateTime).\n" +
                    "FILTER(?timeprecision" + i + ">=" + timePrecision + ")\n}";
            }
            else {
                // Overwrite the previous value apllied.
                timePrecision = getTimePrecision(this.appliedRanges[i].valueLL, this.appliedRanges[i].valueUL,1)
                timeString = "{#date range " + i +"\n?item (p:" + this.appliedRanges[i].filterValue + "/psv:" + this.appliedRanges[i].filterValue + ") ?timenode.\n" +
                    "?timenode wikibase:timeValue ?time.\n" +
                    "?timenode wikibase:timePrecision ?timeprecision.\n" +
                    "FILTER('" + this.appliedRanges[i].valueLL + "'^^xsd:dateTime <= ?time && ?time <= '" + this.appliedRanges[i].valueUL + "'^^xsd:dateTime).\n" +
                    "FILTER(?timeprecision>=" + timePrecision + ")\n}";
            }
        }
        var filterQuantities = "";
        for (let i = 0; i < this.appliedQuantities.length; i++) {
            if (this.appliedQuantities[i].parentFilterValue) {
                if (this.appliedQuantities[i].valueLL == "novalue") {
                    noValueString += "{#quantity range " + i +"\n FILTER(NOT EXISTS { ?item wdt:" + this.appliedQuantities[i].filterValue + " ?no. }).\n}"
                }
                else if (this.appliedQuantities[i].unit == "") {
                    filterQuantities += "{#quantity range " + i +"\n?item wdt:" + this.appliedQuantities[i].parentFilterValue + " ?temp" + i + ".\n" +
                    "?temp" + i + " (p:" + this.appliedQuantities[i].filterValue + "/psv:" + this.appliedQuantities[i].filterValue + ") ?amount" + i + ".\n" +
                    "  ?amount" + i + " wikibase:quantityAmount ?amountValue" + i + ".\n" +
                    "FILTER(" + this.appliedQuantities[i].valueUL + " >= ?amountValue" + i + " && ?amountValue" + i + " >" + this.appliedQuantities[i].valueLL + ")\n}"
                }
                else {
                    filterQuantities += "{#quantity range " + i +"\n?item wdt:" + this.appliedQuantities[i].parentFilterValue + " ?temp" + i + ".\n" +
                    "?temp" + i + " (p:" + this.appliedQuantities[i].filterValue + "/psn:" + this.appliedQuantities[i].filterValue + ") ?amount" + i + ".\n" +
                    "  ?amount" + i + " wikibase:quantityAmount ?amountValue" + i + ".\n" +
                    "FILTER(" + this.appliedQuantities[i].valueUL + " >= ?amountValue" + i + " && ?amountValue" + i + " >" + this.appliedQuantities[i].valueLL + ")\n}"
                    
                }
            }
            else{
                if (this.appliedQuantities[i].valueLL == "novalue") {
                    noValueString += "{#quantity range " + i +"\n FILTER(NOT EXISTS { ?item wdt:" + this.appliedQuantities[i].filterValue + " ?no. }).\n}"
                }
                else if (this.appliedQuantities[i].unit == "") {
                    filterQuantities += "{#quantity range " + i +"\n?item (p:" + this.appliedQuantities[i].filterValue + "/psv:" + this.appliedQuantities[i].filterValue + ") ?amount" + i + ".\n" +
                        "  ?amount" + i + " wikibase:quantityAmount ?amountValue" + i + ".\n" +
                        "FILTER(" + this.appliedQuantities[i].valueUL + " >= ?amountValue" + i + " && ?amountValue" + i + " >" + this.appliedQuantities[i].valueLL + ")\n}"
                }
                else {
                    filterQuantities += "{#quantity range " + i +"\n?item (p:" + this.appliedQuantities[i].filterValue + "/psn:" + this.appliedQuantities[i].filterValue + ") ?amount" + i + ".\n" +
                        "  ?amount" + i + " wikibase:quantityAmount ?amountValue" + i + ".\n" +
                        "FILTER(" + this.appliedQuantities[i].valueUL + " >= ?amountValue" + i + " && ?amountValue" + i + " >" + this.appliedQuantities[i].valueLL + ")\n}"
                }
            }
        }

        if (centralSPARQLService) {
            this.labelClause = "SERVICE <" + centralSPARQLService + "> {\n" +
            "  SERVICE wikibase:label {\n" +
            "    bd:serviceParam wikibase:language \"" + lang + "\".\n" +
            "    ?value rdfs:label ?valueLabel\n" +
            "  }\n" +
            "}\n";
        } else {
            this.labelClause = "SERVICE wikibase:label { bd:serviceParam wikibase:language \"" + lang + "\". }\n";
        }

        // Get the property type for current filter
        sparqlQuery = "SELECT ?property WHERE {\n" +
            "  wd:" + this.currentFilter.value + " wikibase:propertyType ?property.\n" +
            "}";
        var fullUrl = centralSPARQLEndpoint + encodeURIComponent(sparqlQuery);
        var vm = this;
        axios.get(fullUrl)
            .then((response) => {
                var propertyType = response.data['results']['bindings'][0].property.value.split("#")[1];
                if (propertyType == "Time") {
                    // Time property type
                    // Set the URL parameters for href attribute, i.e., only for display purpose. 
                    var q = window.location.search;
                    parameters = new URLSearchParams(q)
                    parameters.delete("cf")
                    parameters.delete("sf")
                    parameters.set("r." + vm.currentFilter.value, "novalue")
                    vm.noValueURL = window.location.pathname + "?" + parameters
                    
                    var sparqlQuery = "SELECT ?time WHERE {\n" +
                        this.classSelector +
                        filterString +
                        filterRanges +
                        timeString +
                        filterQuantities +
                        noValueString +
                        "}\n" +
                        "ORDER by ?time";
                    vm.query = queryServiceWebsiteURL + encodeURIComponent(sparqlQuery);
                    fullUrl = sparqlEndpoint + encodeURIComponent(sparqlQuery);
                    axios.get(fullUrl)
                        .then(response => {
                            if (response.data['results']['bindings'].length) {
                                arr = generateDateBuckets(response.data['results']['bindings'])
                                // Set the href parameter of each bucket.
                                for (var i = 0; i < arr.length; i++) {
                                    var q = window.location.search;
                                    parameters = new URLSearchParams(q)
                                    parameters.delete("cf")
                                    parameters.delete("sf")
                                    if (arr[i].size == 1) parameters.set("r." + vm.currentFilter.value, arr[i].bucketLL.year + "~" + arr[i].bucketUL.year)
                                    else if (arr[i].size == 2) parameters.set("r." + vm.currentFilter.value, arr[i].bucketLL.year)
                                    else if (arr[i].size == 3) parameters.set("r." + vm.currentFilter.value, arr[i].bucketLL.year + "-" + arr[i].bucketLL.month)
                                    else if (arr[i].size == 4) parameters.set("r." + vm.currentFilter.value, arr[i].bucketLL.year + "-" + arr[i].bucketLL.month + "-" + arr[i].bucketLL.day)
                                    else if (arr[i].size == 5) parameters.set("r." + vm.currentFilter.value, arr[i].bucketLL.year + "-" + arr[i].bucketLL.month + "-" + arr[i].bucketLL.day)
                                    arr[i]['href'] = window.location.pathname + "?" + parameters
                                }
                                if (arr.length) {
                                    vm.items = arr;
                                    vm.itemsType = 'Time';
                                    vm.displayCount = 1;
                                    cachedFilterValues[queryString] = {items: vm.items, itemsType: "Time"};

                                    // Get the month names from Wikidata for the current language, and
                                    // replace them into the date bucket names as needed.
                                    monthIDs = '';
                                    for (let i = 0; i < wikidataMonthIDs.length; i++) {
                                        monthIDs += " wd:" + wikidataMonthIDs[i];
                                    }
                                    sparqlQuery =
                                        "SELECT ?value ?valueLabel WHERE {\n" +
                                        "  VALUES ?value {  " + monthIDs + " }\n" +
                                        '  SERVICE wikibase:label { bd:serviceParam wikibase:language "' + lang + '". }\n' +
                                        "}";
                                    var wikidataSPARQLEndpoint = 'https://query.wikidata.org/sparql?query=';
                                    fullUrl = wikidataSPARQLEndpoint + encodeURIComponent(sparqlQuery);
                                    axios.get(fullUrl).then((response) => {
                                        let allData = response.data["results"]["bindings"];
                                        for (let monthNum = 0; monthNum < allData.length ; monthNum++) {
                                            let monthLabel = allData[monthNum].valueLabel.value;
                                            for (let j = 0; j < vm.items.length; j++) {
                                                vm.items[j].bucketName = vm.items[j].bucketName.replace(wikidataMonthIDs[monthNum], monthLabel);
                                            }
                                        }
                                    });
                                }
                                else {
                                    vm.itemsType = 'Additionalempty'
                                }
                            }
                            else {
                                // Check if "No value" is to be displayed or not.
                                index = vm.appliedRanges.findIndex(filter => filter.filterValue == vm.currentFilter.value)
                                if (index == -1) vm.itemsType = "Additionalempty"
                                else vm.itemsType = 'Time'
                            }
                        })
                        .catch(_error => {
                            /* 
                             Gets fallback results in case the primary query fails or times out.
                             Finds random time values and creates buckets.
                            */
                            sparqlQuery = "SELECT ?time WHERE{SELECT ?time WHERE {\n" +
                                "hint:Query hint:optimizer \"None\".\n" +
                                this.classSelector +
                                filterString +
                                "?item wdt:" + vm.currentFilter.value + " ?time.\n" +
                                filterRanges +
                                filterQuantities +
                                "}\n" +
                                "LIMIT " + fallbackQueryLimit + "\n" +
                                "}\n" +
                                "ORDER BY ?time";
                            fullUrl = sparqlEndpoint + encodeURIComponent(sparqlQuery);
                            axios.get(fullUrl)
                                .then(res => {
                                    if (res.data['results']['bindings'].length) {
                                        arr = generateDateBuckets(res.data['results']['bindings'], vm.currentFilter)
                                        // Set the href parameter of each bucket.
                                        for (var i = 0; i < arr.length; i++) {
                                            var q = window.location.search;
                                            parameters = new URLSearchParams(q)
                                            parameters.delete("cf")
                                            parameters.delete("sf")
                                            if (arr[i].size == 1) parameters.set("r." + vm.currentFilter.value, arr[i].bucketLL.year + "~" + arr[i].bucketUL.year)
                                            else if (arr[i].size == 2) parameters.set("r." + vm.currentFilter.value, arr[i].bucketLL.year)
                                            else if (arr[i].size == 3) parameters.set("r." + vm.currentFilter.value, arr[i].bucketLL.year + "-" + arr[i].bucketLL.month)
                                            else if (arr[i].size == 4) parameters.set("r." + vm.currentFilter.value, arr[i].bucketLL.year + "-" + arr[i].bucketLL.month + "-" + arr[i].bucketLL.day)
                                            else if (arr[i].size == 5) parameters.set("r." + vm.currentFilter.value, arr[i].bucketLL.year + "-" + arr[i].bucketLL.month + "-" + arr[i].bucketLL.day)
                                            arr[i]['href'] = window.location.pathname + "?" + parameters
                                        }
                                        vm.items = arr
                                        vm.itemsType = 'Time'
                                        vm.displayCount = 0
                                    }
                                    else {
                                        vm.itemsType = 'TimeFail'
                                    }
                                })
                                .catch(_error => {
                                    vm.itemsType = 'Error'
                                })
                        })
                }
                else if (propertyType == "Quantity") {
                    // Quantity property type
                    // Set the URL parameters for href attribute, i.e., only for display purpose. 
                    var q = window.location.search;
                    parameters = new URLSearchParams(q)
                    parameters.delete("cf")
                    parameters.delete("sf")
                    parameters.set("q." + vm.currentFilter.value, "novalue")
                    vm.noValueURL = window.location.pathname + "?" + parameters
                    /* 
                     Gets items and their normalized amount/quantity.
                     Query for quantities with units. 
                    */
                    var sparqlQuery = "SELECT ?item ?amount WHERE {\n" +
                        this.classSelector +
                        filterString +
                        "?item (p:" + vm.currentFilter.value + "/psn:" + vm.currentFilter.value + ") ?v.\n" +
                        "?v wikibase:quantityAmount ?amount.\n" +
                        filterRanges +
                        filterQuantities +
                        noValueString +
                        "}\n" +
                        "ORDER BY ?amount";
                    vm.query = queryServiceWebsiteURL + encodeURIComponent(sparqlQuery);
                    var fullUrl = sparqlEndpoint + encodeURIComponent(sparqlQuery);
                    axios.get(fullUrl)
                        .then(response => (response.data['results']['bindings'].length ? response : ''))
                        .then((response) => {
                                if (response == "") {
                                    // If the above query returns null then try for un-normalized values.
                                    sparqlQuery = "SELECT ?amount WHERE {\n" +
                                        this.classSelector +
                                        filterString +
                                        "?item (p:" + vm.currentFilter.value + "/psv:" + vm.currentFilter.value + ") ?v.\n" +
                                        "?v wikibase:quantityAmount ?amount.\n" +
                                        filterRanges +
                                        filterQuantities +
                                        noValueString +
                                        "}\n" +
                                        "ORDER BY ?amount";
                                    vm.query = queryServiceWebsiteURL + encodeURIComponent(sparqlQuery);
                                    fullUrl = sparqlEndpoint + encodeURIComponent(sparqlQuery);
                                    axios.get(fullUrl)
                                        .then(res => {
                                            if (res.data['results']['bindings'].length) {
                                                arr = generateFilterValuesFromNumbers(res.data['results']['bindings']);
                                                // Set the href parameter of each bucket.
                                                for (var i = 0; i < arr.length; i++) {
                                                    var q = window.location.search;
                                                    parameters = new URLSearchParams(q);
                                                    parameters.delete("cf");
                                                    parameters.delete("sf");
                                                    parameters.set("q." + vm.currentFilter.value, arr[i].bucketLL + "~" + arr[i].bucketUL + (arr[i].unit != "" ? ("~" + arr[i].unit) : ""));
                                                    arr[i]['href'] = window.location.pathname + "?" + parameters;
                                                }
                                                vm.items = arr;
                                                vm.itemsType = 'Quantity';
                                                vm.displayCount = 1;
                                                cachedFilterValues[queryString] = {items: vm.items, itemsType: "Quantity"};
                                            }
                                            else {
                                                // Check if "No value" is to be displayed or not.
                                                index = vm.appliedQuantities.findIndex(filter => filter.filterValue == vm.currentFilter.value);
                                                if (index != -1) vm.itemsType = "Additionalempty";
                                                else vm.itemsType = 'Quantity';
                                            }
                                        })
                                        .catch(_error => {
                                            /*
                                             Gets fallback results in case the primary query fails or times out.
                                             Finds random quantity amounts and creates buckets.
                                            */
                                            sparqlQuery = "SELECT ?amount WHERE\n" +
                                                "{\n" +
                                                "SELECT ?amount WHERE {\n" +
                                                "hint:Query hint:optimizer \"None\".\n" +
                                                this.classSelector +
                                                "?item (p:" + vm.currentFilter.value + "/psv:" + vm.currentFilter.value + ") ?v.\n" +
                                                "?v wikibase:quantityAmount ?amount.\n" +
                                                "}\n" +
                                                "LIMIT " + fallbackQueryLimit + "\n" +
                                                "}\n" +
                                                "ORDER BY ?amount";
                                            fullUrl = sparqlEndpoint + encodeURIComponent(sparqlQuery);
                                            axios.get(fullUrl)
                                                .then(r => {
                                                    if (r.data['results']['bindings'].length) {
                                                        arr = generateFilterValuesFromNumbers(r.data['results']['bindings']);
                                                        // Set the href parameter of each bucket.
                                                        for (var i = 0; i < arr.length; i++) {
                                                            var q = window.location.search;
                                                            parameters = new URLSearchParams(q);
                                                            parameters.delete("cf");
                                                            parameters.delete("sf");
                                                            parameters.set("q." + vm.currentFilter.value, arr[i].bucketLL + "~" + arr[i].bucketUL + (arr[i].unit != "" ? ("~" + arr[i].unit) : ""));
                                                            arr[i]['href'] = window.location.pathname + "?" + parameters;
                                                        }
                                                        vm.items = arr;
                                                        vm.itemsType = 'Quantity';
                                                        vm.displayCount = 0;
                                                    } else {
                                                        vm.itemsType = 'QuantityFail';
                                                    }
                                                })
                                                .catch(_error => {
                                                    vm.itemsType = 'Error';
                                                });
                                        });
                                }
                                else {
                                    // Above query succeeds, i.e., quantities have units.
                                    firstItem = response.data['results']['bindings'][0].item.value.split("/").slice(-1)[0];
                                    /*
                                     Gets units for the results.
                                     Since the unit of all quantities will be same
                                     just find the unit of first item.
                                    */
                                    if (centralSPARQLService) {
                                        quantityLabelClause = "SERVICE <" + centralSPARQLService + "> {\n" +
                                        "  SERVICE wikibase:label {\n" +
                                        "    bd:serviceParam wikibase:language \"" + lang + "\".\n" +
                                        "    ?unit rdfs:label ?unitLabel\n" +
                                        "  }\n" +
                                        "}\n";
                                    } else {
                                        quantityLabelClause = "SERVICE wikibase:label { bd:serviceParam wikibase:language \"" + lang + "\". }\n";
                                    }
                                    var unitQuery = "SELECT ?unitLabel WHERE {\n" +
                                        "    wd:" + firstItem + " (p:" + vm.currentFilter.value + "/psn:" + vm.currentFilter.value + ") ?v.\n" +
                                        "    ?v wikibase:quantityAmount ?amount;\n" +
                                        "       wikibase:quantityUnit ?unit.\n" +
                                        quantityLabelClause +
                                        "}";
                                    fullUrl = sparqlEndpoint + encodeURIComponent(unitQuery);
                                    axios.get(fullUrl)
                                        .then(res => {
                                            if (response.data['results']['bindings'].length) {
                                                arr = generateFilterValuesFromNumbers(response.data['results']['bindings'], res.data['results']['bindings'][0].unitLabel.value);
                                                // Set the href parameter of each bucket.
                                                for (var i = 0; i < arr.length; i++) {
                                                    var q = window.location.search;
                                                    parameters = new URLSearchParams(q);
                                                    parameters.delete("cf");
                                                    parameters.delete("sf");
                                                    parameters.set("quantity," + vm.currentFilter.value, arr[i].bucketLL + "~" + arr[i].bucketUL + (arr[i].unit != "" ? ("~" + arr[i].unit) : ""));
                                                    arr[i]['href'] = window.location.pathname + "?" + parameters;
                                                }
                                                vm.items = arr;
                                                vm.itemsType = 'Quantity';
                                                vm.displayCount = 1;
                                                cachedFilterValues[queryString] = {items: vm.items, itemsType: "Quantity"};
                                            }
                                            else {
                                                // Check if "No value" is to be displayed or not.
                                                index = vm.appliedFilters.findIndex(filter => filter.filterValue == vm.currentFilter.value);
                                                if (index == -1)
                                                    vm.itemsType = "Additionalempty";
                                                else
                                                    vm.itemsType = 'Quantity';
                                            }
                                        })
                                        .catch(_error => {
                                            vm.itemsType = 'Error';
                                        });
                                }
                            })
                            .catch(_error => {
                                /*
                                    Gets fallback results in case the primary query fails or times out.
                                    Finds random quantity amounts and creates buckets.
                                */
                                sparqlQuery = "SELECT ?amount WHERE\n" +
                                    "{\n" +
                                    "SELECT ?item ?amount WHERE {\n" +
                                    "hint:Query hint:optimizer \"None\".\n" +
                                    this.classSelector +
                                    "?item (p:" + vm.currentFilter.value + "/psn:" + vm.currentFilter.value + ") ?v.\n" +
                                    "?v wikibase:quantityAmount ?amount.\n" +
                                    "}\n" +
                                    "LIMIT " + fallbackQueryLimit + "\n" +
                                    "}\n" +
                                    "ORDER BY ?amount";
                                vm.query = queryServiceWebsiteURL + encodeURIComponent(sparqlQuery);
                                fullUrl = sparqlEndpoint + encodeURIComponent(sparqlQuery);
                                axios.get(fullUrl)
                                    .then(res => {
                                        if (res.data['results']['bindings'].length) {
                                            arr = generateFilterValuesFromNumbers(res.data['results']['bindings'])
                                            // Set the href parameter of each bucket.
                                            for (var i = 0; i < arr.length; i++) {
                                                var q = window.location.search;
                                                parameters = new URLSearchParams(q)
                                                parameters.delete("cf")
                                                parameters.delete("sf")
                                                parameters.set("q." + vm.currentFilter.value, arr[i].bucketLL + "~" + arr[i].bucketUL + (arr[i].unit != "" ? ("~" + arr[i].unit) : ""))
                                                arr[i]['href'] = window.location.pathname + "?" + parameters
                                            }
                                            vm.items = arr
                                            vm.displayCount = 0
                                        }
                                        vm.itemsType = 'Quantity'
                                    })
                                    .catch(_error => {
                                        vm.itemsType = 'Error'
                                    })
                            })
                }
                else {
                   // It's (hopefully) either "WikibaseItem" or "String".
                   if ( propertyType == 'WikibaseItem' ) {
                       vm.itemsType = "ItemLoading";
                   }
                    // Item property type
                    // Set the URL parameters for href attribute, i.e., only for display purpose. 
                    var q = window.location.search;
                    parameters = new URLSearchParams(q)
                    parameters.delete("cf")
                    parameters.delete("sf")
                    parameters.set("f." + vm.currentFilter.value, "novalue")
                    vm.noValueURL = window.location.pathname + "?" + parameters
                    // Gets items and their count.
                    var sparqlQuery = "SELECT ?value ?valueLabel ?count\n" +
                        "WITH {\n" +
                        "SELECT ?value (COUNT(?value) AS ?count) WHERE {\n" +
                        this.classSelector +
                        "?item wdt:" + vm.currentFilter.value + " ?value.\n" +
                        filterString +
                        filterRanges +
                        filterQuantities +
                        noValueString +
                        parentFilterString +
                        "}\n";
                    sparqlQuery +=
                        "GROUP BY ?value\n" +
                        "ORDER BY DESC (?count)\n" +
                        "LIMIT 1000\n" +
                        "} AS %results\n" +
                        "WHERE {\n" +
                        "INCLUDE %results\n" +
                        this.labelClause;

                    sparqlQuery += "}\n" +
                        "ORDER BY DESC (?count)";
                    vm.query = queryServiceWebsiteURL + encodeURIComponent(sparqlQuery);
                    var fullUrl = sparqlEndpoint + encodeURIComponent(sparqlQuery);
                    axios.get(fullUrl)
                        .then(response => {
                            if (response.data['results']['bindings'].length) {
                                arr = [...response.data['results']['bindings']]
                                // Remove the already applied filter value.
                                index = []
                                for (let i = 0; i < vm.appliedFilters.length; i++) {
                                    if (vm.appliedFilters[i].filterValue == vm.currentFilter.value) {
                                        index.push(vm.appliedFilters[i].value)
                                    }
                                }
                                arr = arr.filter(x => (!x.valueLabel.value.includes(".well-known") &&
                                        !index.includes(x.value.value.split('/').slice(-1)[0])));
                                if (arr.length > 0) {
                                    vm.itemsType = (propertyType == 'WikibaseItem') ? "Item" : "String";
                                    vm.items = arr;
                                    vm.displayCount = 1;
                                    cachedFilterValues[queryString] = {items: vm.items, itemsType: vm.itemsType, secondaryFilters: vm.secondaryFilters};
                                }
                                else {
                                    vm.itemsType = "Additionalempty"
                                }
                                // Set the href parameter of each value.
                                for (var i = 0; i < arr.length; i++) {
                                    var q = window.location.search;
                                    parameters = new URLSearchParams(q)
                                    parameters.delete("cf")
                                    parameters.delete("sf")
                                    // Multiple values for a filter
                                    var existingValues = ""
                                    for (let i = 0; i < vm.appliedFilters.length; i++) {
                                        if (vm.appliedFilters[i].filterValue == vm.currentFilter.value) {
                                            existingValues = existingValues + vm.appliedFilters[i].value + "-";
                                        }
                                    }
                                    var filterValue =  arr[i].value.value;
                                    if ( propertyType == 'WikibaseItem' ) {
                                        filterValue = filterValue.split('/').slice(-1)[0];
                                    }
                                    parameters.set("f." + vm.currentFilter.value, existingValues + filterValue);
                                    arr[i]['href'] = window.location.pathname + "?" + parameters;
                                }
                            }
                            else {
                                // Check if "No value" is to be displayed or not.
                                index = vm.appliedFilters.findIndex(filter => filter.filterValue == vm.currentFilter.value)
                                if (index == -1) vm.itemsType = "Additionalempty"
                                else vm.itemsType = 'Item'
                            }
                        })
                        .catch(_error => {
                            /*
                             * Gets random fallback results in case the primary query fails or times out.
                             */
                            if (veryLargeClasses.includes(this.classValue) && this.appliedFilters.length == 0 && this.appliedRanges.length == 0 && this.appliedQuantities.length == 0) {
                                offset = Math.floor(Math.random() * (fallbackQueryLimit * 30));
                            } else {
                                offset = 0;
                            }
                            sparqlQuery = "SELECT ?value ?valueLabel WHERE{\n" +
                                "{\n" +
                                "SELECT DISTINCT ?value\n" +
                                "{\n" +
                                "SELECT ?value WHERE {\n" +
                                "hint:Query hint:optimizer \"None\".\n" +
                                this.classSelector +
                                "?item wdt:" + vm.currentFilter.value + " ?value.\n" +
                                filterString +
                                filterRanges +
                                filterQuantities +
                                "}\n" +
                                "OFFSET " + offset + "\n" +
                                "LIMIT " + fallbackQueryLimit + "\n" +
                                "}\n" +
                                "\n" +
                                "}\n" +
                                this.labelClause +
                                "}\n" +
                                "ORDER BY ?valueLabel";
                            fullUrl = sparqlEndpoint + encodeURIComponent(sparqlQuery);
                            axios.get(fullUrl)
                                .then((res) => {
                                    // Sorting the results
                                    arr = [...res.data['results']['bindings']].slice(0).sort(
                                        function (a, b) {
                                            var x = a.valueLabel.value.toLowerCase();
                                            var y = b.valueLabel.value.toLowerCase();
                                            return x < y ? -1 : x > y ? 1 : 0;
                                        })
                                    // Set the href parameter of each value.
                                    for (var i = 0; i < arr.length; i++) {
                                        var q = window.location.search;
                                        parameters = new URLSearchParams(q);
                                        parameters.delete("cf");
                                        parameters.delete("sf");
                                        var filterValue =  arr[i].value.value;
                                        if ( propertyType == 'WikibaseItem' ) {
                                            filterValue = filterValue.split('/').slice(-1)[0];
                                        }
                                        parameters.set("f." + vm.currentFilter.value, filterValue);
                                        arr[i]['href'] = window.location.pathname + "?" + parameters
                                    }
                                    vm.items = arr
                                    vm.itemsType = "ItemFail"
                                    vm.displayCount = 0
                                })
                                .catch(_error => {
                                    vm.itemsType = 'Error'
                                })

                        })
                }
                // Download csv directly
                if (this.format == 'csv') {
                    this.exportCSV();
                }
            })
    }
})
