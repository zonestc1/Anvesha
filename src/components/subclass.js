subclass = Vue.component('subclass-view', {
    props: ['websiteText', 'fallbackText', 'classValue', 'classLabel', 'appliedFilters', 'appliedRanges', 'appliedQuantities'],
    data() {
        return { items: [], displayCount: 0 }
    },
    template: `
    <div v-if="websiteText!=''">
        <div class="header">
            <p class="heading">
                {{ classLabel }} 
                <a 
                    title="superclass" 
                    :href="pathForView('superclass')" 
                    onclick="return false;" 
                    class="classOptions" 
                    @click.exact="changePage('superclass')" 
                    @click.ctrl="window.open(pathForView('superclass'))">
                    &uarr;
                </a>
            </p>
            <ul>
                <li v-for="filter in appliedFilters">
                    <b>
                        <span v-if="filter.parentFilterValue" v-html="filter.parentFilterValueLabel + arrow + filter.filterValueLabel"></span>
                        <span v-else>
                            {{filter.filterValueLabel}}
                        </span>
                    </b>
                    : 
                    <span v-if="filter.value == 'novalue'" :style="{ fontStyle: 'italic' }">{{ filter.valueLabel }}</span>
                    <span v-else>{{ filter.valueLabel }}</span>
                </li>
                <li v-for="range in appliedRanges">
                    <b>
                        <span v-if="range.parentFilterValue" v-html="range.parentFilterValueLabel + arrow + range.filterValueLabel"></span>
                        <span v-else>
                            {{range.filterValueLabel}}
                        </span>
                    </b>
                    :
                    <span v-if="range.valueLL == 'novalue'" :style="{ fontStyle: 'italic' }">{{ range.valueLabel }}</span>
                    <span v-else>{{ range.valueLabel }}</span>
                </li>
                <li v-for="quantity in appliedQuantities">
                    <b>
                        <span v-if="quantity.parentFilterValue" v-html="quantity.parentFilterValueLabel + arrow + quantity.filterValueLabel"></span>
                        <span v-else>
                            {{quantity.filterValueLabel}}
                        </span>
                    </b>
                    : 
                    <span v-if="quantity.valueLL == 'novalue'" :style="{ fontStyle: 'italic' }">{{ quantity.valueLabel }}</span>
                    <span v-else>{{ quantity.valueLabel }}</span>
                </li>
            </ul>
        </div>
        <p><i>{{ websiteText.changeClassNote||fallbackText.changeClassNote }}</i></p>
        <a @click="changePage('view-all-items')">{{ websiteText.viewList||fallbackText.viewList }}</a>
        <p><b>{{ websiteText.specificClass||fallbackText.specificClass }}</b><p>
        <div class="content">
            <img v-if="!items.length" src='images/loading.gif'>
            <p v-else-if="items[0].value=='Empty'">{{ websiteText.noItems||fallbackText.noItems }}</p>
            <div v-else>
                <ul>
                    <li v-for="item in items">
                        <a 
                            :href="pathFor(item)" 
                            onclick="return false;" 
                            @click.exact="updateClass(item)" 
                            @click.ctrl="window.open(pathFor(item), '_blank')">
                            {{item.valueLabel.value}}
                        </a>
                        <span class="result-count" v-if="displayCount==0">
                            {{ displayPluralCount(websiteText.results||fallbackText.results, item.count.value, false) }}
                        </span>
                    </li>
                </ul>
            </div>
        </div>  
    </div>
    `,
    methods: {
        pathFor(item) {
            var newURL = window.location.pathname + '?';
            var curLang = urlParams.get('lang');
            if (curLang != null) {
                newURL += 'lang=' + curLang + '&';
            }
            return newURL + 'c=' + item.value.value.split('/').slice(-1)[0];
        },
        pathForView(view) {
            return window.location.href + '&view=' + view;
        },
        changePage(page) {
            this.$emit('change-page', page)
        },
        updateClass(item) {
            this.$emit('update-class', item.value.value.split('/').slice(-1)[0], item.valueLabel.value)
        }
    },
    mounted() {
        var sparqlQuery = "SELECT ?value ?valueLabel ?count WHERE{\n" +
            "{\n" +
            "  SELECT ?value (COUNT(?value) AS ?count) WHERE {\n" +
            "  ?v wdt:" + instanceOf + " ?value.\n" +
            "  ?value wdt:" + subclassOf + " wd:" + this.classValue + ".\n" +
            "}\n" +
            "GROUP BY ?value\n" +
            "}\n" +
            "  SERVICE wikibase:label { bd:serviceParam wikibase:language \"" + lang + "\". }\n" +
            "  }\n" +
            "ORDER BY DESC(?count)";
        let vm = this
        const fullUrl = sparqlEndpoint + encodeURIComponent(sparqlQuery);
        axios.get(fullUrl)
            .then(response => (response.data['results']['bindings'].length ? this.items = [...response.data['results']['bindings']] : this.items.push({ value: "Empty", valueLabel: "No data" })))
            .catch(error => {
                sparqlQuery = "SELECT DISTINCT ?value ?valueLabel WHERE {\n" +
                    "  SELECT ?value ?valueLabel WHERE {\n" +
                    "    ?v wdt:" + instanceOf + " ?value.\n" +
                    "    ?value wdt:" + subclassOf + " wd:" + vm.classValue + ";\n" +
                    "  SERVICE wikibase:label { bd:serviceParam wikibase:language \"" + lang + "\". }    \n" +
                    "  }\n" +
                    "  LIMIT " + resultsPerPage + "\n" +
                    "}\n" +
                    "ORDER BY ?valueLabel";
                const fullUrl = sparqlEndpoint + encodeURIComponent(sparqlQuery);
                axios.get(fullUrl)
                    .then(response => (response.data['results']['bindings'].length ? (vm.items = [...response.data['results']['bindings']], vm.displayCount = 1) : vm.items.push({ value: "Empty", valueLabel: "No data" })))
                    .catch(error => {
                        vm.itemsType = 'Error'
                    })
            })
    }
})
