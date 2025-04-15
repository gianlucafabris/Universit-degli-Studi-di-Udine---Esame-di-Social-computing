/* Core */
import {ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators} from "@angular/forms";
/* Material Design */
import {MatStepper} from "@angular/material/stepper";
/* Services */
import {SectionService} from "../../../../../services/section.service";
import {UtilsService} from "../../../../../services/utils.service";
import {DeviceDetectorService} from "ngx-device-detector";
/* Models */
import {Task} from "../../../../../models/skeleton/task";
import {Dimension} from "../../../../../models/skeleton/dimension";
import {Document} from "../../../../../../../data/build/skeleton/document";
/* Components */
import {CrowdXplorer} from "./crowd-xplorer/crowd-xplorer.component";

@Component({
    selector: 'app-search-engine',
    templateUrl: './search-engine.component.html',
    styleUrls: ['./search-engine.component.scss']
})
export class SearchEngineComponent implements OnInit {

    /* Change detector to manually intercept changes on DOM */
    changeDetector: ChangeDetectorRef;

    /* Service to detect user's device */
    sectionService: SectionService;
    utilsService: UtilsService
    /* Angular Reactive Form builder (see https://angular.io/guide/reactive-forms) */
    formBuilder: UntypedFormBuilder;

    @Input() task: Task
    @Input() documentIndex: number
    @Input() dimensionIndex: number

    searchEngineForm: UntypedFormGroup

    dimension: Dimension

    @Output() formEmitter: EventEmitter<UntypedFormGroup>;
    @Output() urlSelectedEmitter: EventEmitter<boolean>;

    /* References to task stepper and token forms */
    @ViewChild('stepper') stepper: MatStepper;
    @ViewChild(CrowdXplorer) crowdXplorer: CrowdXplorer;

    constructor(
        changeDetector: ChangeDetectorRef,
        deviceDetectorService: DeviceDetectorService,
        sectionService: SectionService,
        utilsService: UtilsService,
        formBuilder: UntypedFormBuilder,
    ) {
        this.changeDetector = changeDetector
        this.sectionService = sectionService
        this.utilsService = utilsService
        this.formBuilder = formBuilder
        this.urlSelectedEmitter = new EventEmitter<boolean>();
        this.formEmitter = new EventEmitter<UntypedFormGroup>();
    }

    ngOnInit() {
        this.dimension = this.task.dimensions[this.dimensionIndex]
        let controlsConfig = {};
        if (this.dimension.url) controlsConfig[`${this.dimension.name}_url`] = new UntypedFormControl('', [Validators.required, this.validateSearchEngineUrl.bind(this)]);
        this.searchEngineForm = this.formBuilder.group(controlsConfig)
        this.searchEngineForm.valueChanges.subscribe(values => {
            this.formEmitter.emit(this.searchEngineForm)
        })
        this.formEmitter.emit(this.searchEngineForm)


    }

    /*
     * This function performs a validation of the worker url field each time the current worker types or pastes in its inside
     * or when he selects one of the responses retrieved by the search engine. If the url present in the field is not equal
     * to an url retrieved by the search engine an <invalidSearchEngineUrl> error is raised.
     * IMPORTANT: the <return null> part means: THE FIELD IS VALID
     */
    public validateSearchEngineUrl(workerUrlFormControl: UntypedFormControl) {
        /* If the stepped is initialized to something the task is started */
        if (this.stepper) {
            if (this.stepper.selectedIndex >= this.task.questionnaireAmountStart && this.stepper.selectedIndex < this.task.questionnaireAmountStart + this.task.documentsAmount) {
                /* If the worker has interacted with the form control of a dimension */
                if (this.task.currentDimension) {
                    let currentDocument = this.stepper.selectedIndex - this.task.questionnaireAmountStart;
                    /* If there are data for the current document */
                    if (this.task.searchEngineRetrievedResponses[currentDocument]) {
                        let retrievedResponses = this.task.searchEngineRetrievedResponses[currentDocument];
                        if (retrievedResponses.hasOwnProperty("data")) {
                            /* The current set of responses is the total amount - 1 */
                            let currentSet = retrievedResponses["data"].length - 1;
                            /* The responses retrieved by search engine are selected */
                            let currentResponses = retrievedResponses["data"][currentSet]["response"];
                            let currentDimension = retrievedResponses["data"][currentSet]["dimension"];
                            /* Each response is scanned */
                            for (let index = 0; index < currentResponses.length; index++) {
                                /* As soon as an url that matches with the one selected/typed by the worker for the current dimension the validation is successful */
                                if (workerUrlFormControl.value == currentResponses[index].url && this.task.currentDimension == currentDimension) return null;
                            }
                            /* If no matching url has been found, raise the error */
                            return {invalidSearchEngineUrl: "Select (or copy & paste) one of the URLs shown above."}
                        }
                        return null
                    }
                    return null
                }
                return null
            }
            return null
        }
        return null
    }

    /* |--------- SEARCH ENGINE INTEGRATION (see: search_engine.json | https://github.com/Miccighel/CrowdXplorer) ---------| */

    public handleSearchEngineRetrievedResponse(retrievedResponseData, documentCurrent: Document, dimension: Dimension) {
        this.task.storeSearchEngineRetrievedResponse(retrievedResponseData, documentCurrent, dimension)
        this.searchEngineForm.get(dimension.name.concat("_url")).enable();
        let labelsSelect = document.getElementsByClassName('label-select')
        if (Array.from(labelsSelect).length <= 0) {
            let headerRow = document.getElementsByClassName('mat-header-row')
            for (let header of Array.from(headerRow)) {
                let sel = document.createElement('div')
                sel.setAttribute("style", `color:#0000008a;font-size:medium;font-weight:500;padding-right:0.75em;`);
                sel.setAttribute("class", `label-select`);
                sel.innerText = "Select"
                header.append(sel)
            }
        }

        //$('.cdk-table').css({'border': '2px solid lightgrey', 'border-radius' : '8px', 'padding' :' 5px  5px '})
    }

    public handleSearchEngineSelectedResponse(selectedResponseData, document: Document, dimension: Dimension) {
        this.task.storeSearchEngineSelectedResponse(selectedResponseData, document, dimension)
        this.searchEngineForm.get(dimension.name.concat("_url")).setValue(selectedResponseData['url']);
        this.urlSelectedEmitter.emit(true)
        this.formEmitter.emit(this.searchEngineForm)
    }
}
