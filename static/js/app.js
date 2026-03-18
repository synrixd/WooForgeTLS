const productsContainer = document.getElementById("productsContainer");
const productTemplate = document.getElementById("productCardTemplate");
const productCount = document.getElementById("productCount");
const productsForm = document.getElementById("productsForm");

const addProductTopButton = document.getElementById("addProductTop");
const addProductMidButton = document.getElementById("addProductMid");
const addProductBottomButton = document.getElementById("addProductBottom");

const saveDraftButton = document.getElementById("saveDraftButton");
const restoreDraftButton = document.getElementById("restoreDraftButton");
const clearDraftButton = document.getElementById("clearDraftButton");
const exportJsonButton = document.getElementById("exportJsonButton");
const importJsonButton = document.getElementById("importJsonButton");
const importJsonFileInput = document.getElementById("importJsonFileInput");

const expandAllButton = document.getElementById("expandAllButton");
const openShortcutsModalButton = document.getElementById("openShortcutsModalButton");
const shortcutsModalOverlay = document.getElementById("shortcutsModalOverlay");
const closeShortcutsModalButton = document.getElementById("closeShortcutsModalButton");

const collapseAllButton = document.getElementById("collapseAllButton");

const draftNotice = document.getElementById("draftNotice");
const undoDeleteBar = document.getElementById("undoDeleteBar");
const undoDeleteText = document.getElementById("undoDeleteText");
const undoDeleteButton = document.getElementById("undoDeleteButton");
const globalStatusText = document.getElementById("globalStatusText");

const LOCAL_STORAGE_KEY = "wooforgetls_products_draft";
const LOCAL_STORAGE_TIMESTAMP_KEY = "wooforgetls_products_draft_saved_at";

let lastDeletedProductData = null;
let lastDeletedProductIndex = null;
let undoDeleteTimeout = null;
let pywebviewApiReady = false;

window.addEventListener("pywebviewready", function () {
    pywebviewApiReady = true;
});

function updateProductNumbers() {
    const allCards = productsContainer.querySelectorAll(".product-card");

    for (let index = 0; index < allCards.length; index++) {
        const currentCard = allCards[index];
        const currentNumberElement = currentCard.querySelector(".product-number");

        if (currentNumberElement) {
            currentNumberElement.textContent = index + 1;
        }
    }

    productCount.textContent = allCards.length;
}

function getInputValue(card, selector) {
    const element = card.querySelector(selector);

    if (element) {
        return element.value.trim();
    }

    return "";
}

function setInputValue(card, selector, value) {
    const element = card.querySelector(selector);

    if (element) {
        element.value = value;
    }
}

function getCardFieldData(card) {
    const inputs = card.querySelectorAll("input, textarea");
    const data = {};

    for (let index = 0; index < inputs.length; index++) {
        const currentInput = inputs[index];
        const currentName = currentInput.getAttribute("name");

        if (currentName) {
            data[currentName] = currentInput.value;
        }
    }

    data["_collapsed_state"] = card.classList.contains("collapsed");

    return data;
}

function setCardFieldData(card, data) {
    const inputs = card.querySelectorAll("input, textarea");

    for (let index = 0; index < inputs.length; index++) {
        const currentInput = inputs[index];
        const currentName = currentInput.getAttribute("name");

        if (currentName && Object.prototype.hasOwnProperty.call(data, currentName)) {
            currentInput.value = data[currentName];
        }
    }

    updateCardLiveTitle(card);
    updateCardStatus(card);
    buildSummary(card);

    if (data["_collapsed_state"] === true) {
        collapseCard(card, false);
    } else {
        expandCard(card, false);
    }
}

function buildSummary(card) {
    const nameValue = getInputValue(card, 'input[name="name[]"]');
    const regularPriceValue = getInputValue(card, 'input[name="regular_price[]"]');
    const salePriceValue = getInputValue(card, 'input[name="sale_price[]"]');
    const categoriesValue = getInputValue(card, 'input[name="categories[]"]');
    const keywordValue = getInputValue(card, 'input[name="focus_keyword[]"]');
    const imageValue = getInputValue(card, 'input[name="images[]"]');
    const downloadUrlValue = getInputValue(card, 'input[name="download_url[]"]');
    const seoDescriptionValue = getInputValue(card, 'textarea[name="seo_description[]"]');

    const summaryElement = card.querySelector(".product-summary");

    let finalName = nameValue;
    let finalRegularPrice = regularPriceValue;
    let finalSalePrice = salePriceValue;
    let finalCategories = categoriesValue;
    let finalKeyword = keywordValue;
    let finalImage = imageValue;
    let finalDownloadUrl = downloadUrlValue;
    let finalSeoDescription = seoDescriptionValue;

    if (finalName === "") {
        finalName = "Sin nombre";
    }

    if (finalRegularPrice === "") {
        finalRegularPrice = "—";
    }

    if (finalSalePrice === "") {
        finalSalePrice = "—";
    }

    if (finalCategories === "") {
        finalCategories = "—";
    }

    if (finalKeyword === "") {
        finalKeyword = "—";
    }

    if (finalImage === "") {
        finalImage = "No";
    } else {
        finalImage = "Sí";
    }

    if (finalDownloadUrl === "") {
        finalDownloadUrl = "No";
    } else {
        finalDownloadUrl = "Sí";
    }

    if (finalSeoDescription === "") {
        finalSeoDescription = "No";
    } else {
        finalSeoDescription = "Sí";
    }

    summaryElement.innerHTML =
        "<strong>" + finalName + "</strong>" +
        "Precio regular: " + finalRegularPrice + " · Oferta: " + finalSalePrice + "<br>" +
        "Categoría: " + finalCategories + "<br>" +
        "Keyword: " + finalKeyword + "<br>" +
        "Imagen cargada: " + finalImage + "<br>" +
        "Descarga cargada: " + finalDownloadUrl + "<br>" +
        "SEO description: " + finalSeoDescription;
}

function expandCard(card, shouldSave) {
    card.classList.remove("collapsed");
    card.classList.add("expanded");

    const toggleButton = card.querySelector(".toggle-product-btn");

    if (toggleButton) {
        toggleButton.textContent = "Contraer";
    }

    if (shouldSave !== false) {
        autoSaveDraft();
    }
}

function collapseCard(card, shouldSave) {
    buildSummary(card);

    card.classList.remove("expanded");
    card.classList.add("collapsed");

    const toggleButton = card.querySelector(".toggle-product-btn");

    if (toggleButton) {
        toggleButton.textContent = "Editar / Expandir";
    }

    if (shouldSave !== false) {
        autoSaveDraft();
    }
}

function getMissingFieldsForCard(card) {
    const missingFields = [];

    const nameValue = getInputValue(card, 'input[name="name[]"]');
    const regularPriceValue = getInputValue(card, 'input[name="regular_price[]"]');
    const categoriesValue = getInputValue(card, 'input[name="categories[]"]');
    const imagesValue = getInputValue(card, 'input[name="images[]"]');
    const downloadUrlValue = getInputValue(card, 'input[name="download_url[]"]');
    const keywordValue = getInputValue(card, 'input[name="focus_keyword[]"]');
    const seoDescriptionValue = getInputValue(card, 'textarea[name="seo_description[]"]');

    if (nameValue === "") {
        missingFields.push("nombre");
    }

    if (regularPriceValue === "") {
        missingFields.push("precio regular");
    }

    if (categoriesValue === "") {
        missingFields.push("categoría");
    }

    if (imagesValue === "") {
        missingFields.push("imagen");
    }

    if (downloadUrlValue === "") {
        missingFields.push("URL de descarga");
    }

    if (keywordValue === "") {
        missingFields.push("focus keyword");
    }

    if (seoDescriptionValue === "") {
        missingFields.push("descripción SEO");
    }

    return missingFields;
}

function updateCardLiveTitle(card) {
    const nameValue = getInputValue(card, 'input[name="name[]"]');
    const liveNameElement = card.querySelector(".product-live-name");

    if (liveNameElement) {
        if (nameValue === "") {
            liveNameElement.textContent = "";
        } else {
            liveNameElement.textContent = "— " + nameValue;
        }
    }
}

function updateCardStatus(card) {
    const statusBadge = card.querySelector(".product-status-badge");
    const nameValue = getInputValue(card, 'input[name="name[]"]');
    const missingFields = getMissingFieldsForCard(card);

    card.classList.remove("status-complete");
    card.classList.remove("status-missing");
    card.classList.remove("status-no-name");

    if (nameValue === "") {
        card.classList.add("status-no-name");

        if (statusBadge) {
            statusBadge.textContent = "Sin nombre";
        }
    } else if (missingFields.length === 0) {
        card.classList.add("status-complete");

        if (statusBadge) {
            statusBadge.textContent = "Completo";
        }
    } else {
        card.classList.add("status-missing");

        if (statusBadge) {
            statusBadge.textContent = "Faltan datos";
        }
    }

    updateCardLiveTitle(card);
    buildSummary(card);
    updateGlobalStatus();
}

function updateGlobalStatus() {
    const allCards = productsContainer.querySelectorAll(".product-card");

    if (allCards.length === 0) {
        globalStatusText.textContent = "Sin productos";
        return;
    }

    let completeCount = 0;
    let missingCount = 0;
    let noNameCount = 0;

    for (let index = 0; index < allCards.length; index++) {
        const card = allCards[index];

        if (card.classList.contains("status-complete")) {
            completeCount = completeCount + 1;
        } else if (card.classList.contains("status-no-name")) {
            noNameCount = noNameCount + 1;
        } else {
            missingCount = missingCount + 1;
        }
    }

    globalStatusText.textContent =
        "Completos: " + completeCount +
        " · Incompletos: " + missingCount +
        " · Sin nombre: " + noNameCount;
}

function removeValidationHighlights() {
    const allCards = productsContainer.querySelectorAll(".product-card");

    for (let index = 0; index < allCards.length; index++) {
        allCards[index].classList.remove("validation-error");
    }
}

function attachFieldListeners(card) {
    const allFields = card.querySelectorAll("input, textarea");

    for (let index = 0; index < allFields.length; index++) {
        const currentField = allFields[index];

        currentField.addEventListener("input", function () {
            updateCardStatus(card);
            card.classList.remove("validation-error");
            autoSaveDraft();
        });

        currentField.addEventListener("change", function () {
            updateCardStatus(card);
            card.classList.remove("validation-error");
            autoSaveDraft();
        });
    }
}

function moveCardUp(card) {
    const previousCard = card.previousElementSibling;

    if (previousCard) {
        productsContainer.insertBefore(card, previousCard);
        updateProductNumbers();
        autoSaveDraft();
        card.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}

function moveCardDown(card) {
    const nextCard = card.nextElementSibling;

    if (nextCard) {
        productsContainer.insertBefore(nextCard, card);
        updateProductNumbers();
        autoSaveDraft();
        card.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}

function showUndoDeleteBar() {
    undoDeleteBar.classList.remove("hidden");

    if (undoDeleteTimeout) {
        clearTimeout(undoDeleteTimeout);
    }

    undoDeleteTimeout = setTimeout(function () {
        hideUndoDeleteBar();
    }, 8000);
}

function hideUndoDeleteBar() {
    undoDeleteBar.classList.add("hidden");
    undoDeleteTimeout = null;
}

function removeCardWithUndo(card) {
    const confirmDelete = window.confirm("¿Seguro que quieres eliminar este producto?");

    if (confirmDelete === false) {
        return;
    }

    const allCards = Array.from(productsContainer.querySelectorAll(".product-card"));
    const cardIndex = allCards.indexOf(card);

    lastDeletedProductData = getCardFieldData(card);
    lastDeletedProductIndex = cardIndex;

    card.remove();
    updateProductNumbers();
    updateGlobalStatus();
    autoSaveDraft();

    undoDeleteText.textContent = "Producto eliminado. Puedes deshacer la acción.";
    showUndoDeleteBar();
}

function restoreLastDeletedProduct() {
    if (lastDeletedProductData === null) {
        return;
    }

    const restoredCard = createCardElement();
    setCardFieldData(restoredCard, lastDeletedProductData);

    const currentCards = productsContainer.querySelectorAll(".product-card");

    if (lastDeletedProductIndex !== null && lastDeletedProductIndex >= 0 && lastDeletedProductIndex < currentCards.length) {
        productsContainer.insertBefore(restoredCard, currentCards[lastDeletedProductIndex]);
    } else {
        productsContainer.appendChild(restoredCard);
    }

    attachCardEvents(restoredCard);
    updateProductNumbers();
    updateCardStatus(restoredCard);
    autoSaveDraft();

    restoredCard.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    lastDeletedProductData = null;
    lastDeletedProductIndex = null;
    hideUndoDeleteBar();
}

function attachCardEvents(card) {
    const removeButton = card.querySelector(".remove-product-btn");
    const toggleButton = card.querySelector(".toggle-product-btn");
    const moveUpButton = card.querySelector(".move-up-btn");
    const moveDownButton = card.querySelector(".move-down-btn");

    if (removeButton) {
        removeButton.addEventListener("click", function () {
            removeCardWithUndo(card);
        });
    }

    if (toggleButton) {
        toggleButton.addEventListener("click", function () {
            if (card.classList.contains("collapsed")) {
                expandCard(card);
            } else {
                collapseCard(card);
            }
        });
    }

    if (moveUpButton) {
        moveUpButton.addEventListener("click", function () {
            moveCardUp(card);
        });
    }

    if (moveDownButton) {
        moveDownButton.addEventListener("click", function () {
            moveCardDown(card);
        });
    }

    attachFieldListeners(card);
    updateCardStatus(card);
}

function createCardElement() {
    const clone = productTemplate.content.cloneNode(true);
    const card = clone.querySelector(".product-card");
    return card;
}

function addProductCard(data, shouldScroll, shouldFocusName) {
    const card = createCardElement();

    attachCardEvents(card);
    productsContainer.appendChild(card);

    if (data) {
        setCardFieldData(card, data);
    } else {
        updateCardStatus(card);
    }

    updateProductNumbers();
    autoSaveDraft();

    if (shouldScroll !== false) {
        card.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    if (shouldFocusName !== false) {
        const nameInput = card.querySelector('input[name="name[]"]');

        if (nameInput) {
            setTimeout(function () {
                nameInput.focus();
            }, 250);
        }
    }

    return card;
}

function collectAllProductsData() {
    const allCards = productsContainer.querySelectorAll(".product-card");
    const products = [];

    for (let index = 0; index < allCards.length; index++) {
        const card = allCards[index];
        const currentProductData = getCardFieldData(card);
        products.push(currentProductData);
    }

    return products;
}

function saveDraftToLocalStorage() {
    const allProductsData = collectAllProductsData();
    const jsonData = JSON.stringify(allProductsData);

    localStorage.setItem(LOCAL_STORAGE_KEY, jsonData);
    localStorage.setItem(LOCAL_STORAGE_TIMESTAMP_KEY, String(Date.now()));

    showDraftNoticeIfNeeded();
}

function autoSaveDraft() {
    saveDraftToLocalStorage();
}

function hasUsefulDraftData(parsedDraft) {
    if (!Array.isArray(parsedDraft)) {
        return false;
    }

    if (parsedDraft.length === 0) {
        return false;
    }

    for (let index = 0; index < parsedDraft.length; index++) {
        const currentProduct = parsedDraft[index];

        if (currentProduct && typeof currentProduct === "object") {
            if (Object.prototype.hasOwnProperty.call(currentProduct, "name[]")) {
                const currentNameValue = String(currentProduct["name[]"]).trim();

                if (currentNameValue !== "") {
                    return true;
                }
            }
        }
    }

    return false;
}

function restoreDraftFromLocalStorage() {
    const rawDraft = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (!rawDraft) {
        window.alert("No hay borrador guardado en localStorage.");
        return;
    }

    let parsedDraft = [];

    try {
        parsedDraft = JSON.parse(rawDraft);
    } catch (error) {
        window.alert("El borrador guardado está corrupto o no se pudo leer.");
        return;
    }

    if (!hasUsefulDraftData(parsedDraft)) {
        window.alert("No hay un borrador útil para restaurar.");
        showDraftNoticeIfNeeded();
        return;
    }

    productsContainer.innerHTML = "";

    for (let index = 0; index < parsedDraft.length; index++) {
        addProductCard(parsedDraft[index], false, false);
    }

    if (parsedDraft.length === 0) {
        addProductCard(null, false, false);
    }

    updateProductNumbers();
    updateGlobalStatus();
    showDraftNoticeIfNeeded();

    window.alert("Borrador restaurado correctamente.");
}

function clearDraftFromLocalStorage() {
    const confirmClear = window.confirm("¿Seguro que quieres borrar el borrador guardado localmente?");

    if (confirmClear === false) {
        return;
    }

    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(LOCAL_STORAGE_TIMESTAMP_KEY);

    showDraftNoticeIfNeeded();

    showToast("Borrador eliminado correctamente.");
}

function showDraftNoticeIfNeeded() {
    const rawDraft = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (!rawDraft) {
        draftNotice.classList.add("hidden");
        return;
    }

    let parsedDraft = [];

    try {
        parsedDraft = JSON.parse(rawDraft);
    } catch (error) {
        draftNotice.classList.add("hidden");
        return;
    }

    if (hasUsefulDraftData(parsedDraft)) {
        draftNotice.classList.remove("hidden");
    } else {
        draftNotice.classList.add("hidden");
    }
}

function collapseAllCards() {
    const allCards = productsContainer.querySelectorAll(".product-card");

    for (let index = 0; index < allCards.length; index++) {
        collapseCard(allCards[index], false);
    }

    autoSaveDraft();
}

function expandAllCards() {
    const allCards = productsContainer.querySelectorAll(".product-card");

    for (let index = 0; index < allCards.length; index++) {
        expandCard(allCards[index], false);
    }

    autoSaveDraft();
}

async function exportDraftAsJsonFile() {
    const allProductsData = collectAllProductsData();
    const jsonString = JSON.stringify(allProductsData, null, 4);
    const suggestedFilename = "wooforgetls-draft.json";

    if (!isDesktopAppEnvironment()) {
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const tempLink = document.createElement("a");
        tempLink.href = url;
        tempLink.download = suggestedFilename;
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);

        URL.revokeObjectURL(url);
        showToast("JSON exportado correctamente.");
        return;
    }

    try {
        const saveResult = await window.pywebview.api.save_json_file(jsonString, suggestedFilename);

        if (!saveResult) {
            window.alert("No se recibió respuesta al guardar el JSON.");
            return;
        }

        if (saveResult.cancelled === true) {
            return;
        }

        if (saveResult.success) {
            showToast("JSON guardado correctamente.");
        } else {
            window.alert(saveResult.message || "No se pudo guardar el JSON.");
        }
    } catch (error) {
        window.alert("Ocurrió un error al exportar el JSON.");
    }
}

function isDesktopAppEnvironment() {
    return pywebviewApiReady &&
           typeof window.pywebview !== "undefined" &&
           window.pywebview !== null &&
           typeof window.pywebview.api !== "undefined" &&
           window.pywebview.api !== null;
}

async function exportCsvWithNativeSaveDialog() {
    const formData = new FormData(productsForm);

    let response;
    let result;

    try {
        response = await fetch("/api/export-csv-data", {
            method: "POST",
            body: formData
        });
    } catch (error) {
        window.alert("No se pudo conectar con el backend para generar el CSV.");
        return;
    }

    try {
        result = await response.json();
    } catch (error) {
        window.alert("La respuesta del servidor no se pudo leer.");
        return;
    }

    if (!response.ok || !result.success) {
        window.alert(result.message || "No se pudo generar el CSV.");
        return;
    }

    if (!isDesktopAppEnvironment()) {
        const csvBlob = new Blob(["\ufeff" + result.csv_text], { type: "text/csv;charset=utf-8;" });
        const csvUrl = URL.createObjectURL(csvBlob);

        const tempLink = document.createElement("a");
        tempLink.href = csvUrl;
        tempLink.download = result.filename;
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);

        URL.revokeObjectURL(csvUrl);

        showToast("CSV generado correctamente.");
        return;
    }

    let saveResult;

    try {
        saveResult = await window.pywebview.api.save_csv_file(result.csv_text, result.filename);
    } catch (error) {
        window.alert("Ocurrió un error al abrir la ventana de guardado.");
        return;
    }

    if (!saveResult) {
        window.alert("No se recibió respuesta al guardar el archivo.");
        return;
    }

    if (saveResult.cancelled === true) {
        return;
    }

    if (saveResult.success) {
        showToast("CSV guardado correctamente.");
    } else {
        window.alert(saveResult.message || "No se pudo guardar el archivo.");
    }
}

function importDraftFromJsonText(jsonText) {
    let parsedData = [];

    try {
        parsedData = JSON.parse(jsonText);
    } catch (error) {
        window.alert("El archivo JSON no es válido.");
        return;
    }

    if (!Array.isArray(parsedData)) {
        window.alert("El archivo JSON debe contener un arreglo de productos.");
        return;
    }

    productsContainer.innerHTML = "";

    for (let index = 0; index < parsedData.length; index++) {
        addProductCard(parsedData[index], false, false);
    }

    if (parsedData.length === 0) {
        addProductCard(null, false, false);
    }

    updateProductNumbers();
    updateGlobalStatus();
    autoSaveDraft();
    showDraftNoticeIfNeeded();

    window.alert("Borrador importado correctamente.");
}

function validateProductsBeforeSubmit() {
    removeValidationHighlights();

    const allCards = productsContainer.querySelectorAll(".product-card");
    const validationMessages = [];

    for (let index = 0; index < allCards.length; index++) {
        const card = allCards[index];
        const missingFields = getMissingFieldsForCard(card);

        if (missingFields.length > 0) {
            card.classList.add("validation-error");

            if (card.classList.contains("collapsed")) {
                buildSummary(card);
            }

            validationMessages.push(
                "Producto " + (index + 1) + ": falta " + missingFields.join(", ")
            );
        }
    }

    if (validationMessages.length > 0) {
        const firstInvalidCard = productsContainer.querySelector(".product-card.validation-error");

        if (firstInvalidCard) {
            firstInvalidCard.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }

        const shouldContinue = window.confirm(
            "Hay productos incompletos:\n\n" +
            validationMessages.join("\n") +
            "\n\n¿Quieres generar el CSV de todas formas?"
        );

        if (shouldContinue === false) {
            return false;
        }
    }

    return true;
}

function initializeFromLocalStorageIfExists() {
    const rawDraft = localStorage.getItem(LOCAL_STORAGE_KEY);

    if (rawDraft) {
        try {
            const parsedDraft = JSON.parse(rawDraft);

            if (hasUsefulDraftData(parsedDraft)) {
                productsContainer.innerHTML = "";

                for (let index = 0; index < parsedDraft.length; index++) {
                    addProductCard(parsedDraft[index], false, false);
                }

                updateProductNumbers();
                updateGlobalStatus();
                showDraftNoticeIfNeeded();
                return;
            }
        } catch (error) {
        }
    }

    addProductCard(null, false, false);
    updateProductNumbers();
    updateGlobalStatus();
    showDraftNoticeIfNeeded();
}

function openShortcutsModal() {
    if (shortcutsModalOverlay) {
        shortcutsModalOverlay.classList.remove("hidden");
    }
}

function closeShortcutsModal() {
    if (shortcutsModalOverlay) {
        shortcutsModalOverlay.classList.add("hidden");
    }
}

function toggleShortcutsModal() {
    if (!shortcutsModalOverlay) {
        return;
    }

    if (shortcutsModalOverlay.classList.contains("hidden")) {
        openShortcutsModal();
    } else {
        closeShortcutsModal();
    }
}

function toggleExpandCollapseAllByShortcut() {
    const allCards = productsContainer.querySelectorAll(".product-card");

    if (allCards.length === 0) {
        return;
    }

    let hasExpanded = false;

    for (let index = 0; index < allCards.length; index++) {
        if (allCards[index].classList.contains("expanded")) {
            hasExpanded = true;
        }
    }

    if (hasExpanded) {
        collapseAllCards();
    } else {
        expandAllCards();
    }
}

addProductTopButton.addEventListener("click", function () {
    addProductCard(null, true, true);
});

addProductMidButton.addEventListener("click", function () {
    addProductCard(null, true, true);
});

addProductBottomButton.addEventListener("click", function () {
    addProductCard(null, true, true);
});

saveDraftButton.addEventListener("click", function () {
    saveDraftToLocalStorage();
    showToast("Borrador guardado en localStorage.");
});

restoreDraftButton.addEventListener("click", function () {
    restoreDraftFromLocalStorage();
});

clearDraftButton.addEventListener("click", function () {
    clearDraftFromLocalStorage();
});

expandAllButton.addEventListener("click", function () {
    expandAllCards();
});

collapseAllButton.addEventListener("click", function () {
    collapseAllCards();
});

if (openShortcutsModalButton) {
    openShortcutsModalButton.addEventListener("click", function () {
        openShortcutsModal();
    });
}

if (closeShortcutsModalButton) {
    closeShortcutsModalButton.addEventListener("click", function () {
        closeShortcutsModal();
    });
}

if (shortcutsModalOverlay) {
    shortcutsModalOverlay.addEventListener("click", function (event) {
        if (event.target === shortcutsModalOverlay) {
            closeShortcutsModal();
        }
    });
}

exportJsonButton.addEventListener("click", async function () {
    await exportDraftAsJsonFile();
});

importJsonButton.addEventListener("click", function () {
    importJsonFileInput.value = "";
    importJsonFileInput.click();
});

importJsonFileInput.addEventListener("change", function (event) {
    const selectedFile = event.target.files[0];

    if (!selectedFile) {
        return;
    }

    const reader = new FileReader();

    reader.onload = function (loadEvent) {
        const fileText = loadEvent.target.result;
        importDraftFromJsonText(fileText);
    };

    reader.readAsText(selectedFile);
});

undoDeleteButton.addEventListener("click", function () {
    restoreLastDeletedProduct();
});

productsForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const isValidToContinue = validateProductsBeforeSubmit();

    if (isValidToContinue === false) {
        return;
    }

    saveDraftToLocalStorage();

    await exportCsvWithNativeSaveDialog();
});

document.addEventListener("keydown", function (event) {
    const isAKey = event.key.toLowerCase() === "a";
    const isEKey = event.key.toLowerCase() === "e";
    const isSKey = event.key.toLowerCase() === "s";
    const isQuestionKey = event.key === "?";
    const isEscapeKey = event.key === "Escape";

    if (event.ctrlKey && event.shiftKey && isAKey) {
        event.preventDefault();
        addProductCard(null, true, true);
    }

    if (event.ctrlKey && event.shiftKey && isEKey) {
        event.preventDefault();
        toggleExpandCollapseAllByShortcut();
    }

    if (event.ctrlKey && event.shiftKey && isSKey) {
        event.preventDefault();
        exportDraftAsJsonFile();
    }

    // Esto es un comentario de una sola línea

    if (isQuestionKey) {
        const activeTag = document.activeElement ? document.activeElement.tagName : "";

        if (activeTag !== "INPUT" && activeTag !== "TEXTAREA") {
            event.preventDefault();
            toggleShortcutsModal();
        }
    }

    if (isEscapeKey) {
        closeShortcutsModal();
    }
});

initializeFromLocalStorageIfExists();

function showToast(message) {
    const toast = document.createElement("div");

    toast.textContent = message;

    toast.style.position = "fixed";
    toast.style.bottom = "20px";
    toast.style.right = "20px";
    toast.style.padding = "14px 20px";
    toast.style.background = "rgba(0,0,0,0.85)";
    toast.style.color = "#fff";
    toast.style.borderRadius = "12px";
    toast.style.zIndex = "9999";
    toast.style.boxShadow = "0 10px 30px rgba(0,0,0,0.4)";
    toast.style.fontSize = "14px";

    document.body.appendChild(toast);

    setTimeout(function () {
        toast.remove();
    }, 3000);
}