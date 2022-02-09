(function (global, doc, ibexa) {
    const dropdowns = doc.querySelectorAll('.ibexa-dropdown:not(.ibexa-dropdown--custom-init)');

    dropdowns.forEach((dropdownContainer) => {
        const dropdown = new ibexa.core.Dropdown({
            container: dropdownContainer,
        });

        dropdownContainer.instance = dropdown;

        dropdown.init();
    });
})(window, window.document, window.ibexa);
