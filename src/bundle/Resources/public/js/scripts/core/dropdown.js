(function (global, doc, ibexa, bootstrap) {
    const EVENT_VALUE_CHANGED = 'change';
    const RESTRICTED_AREA_ITEMS_CONTAINER = 190;
    const MINIMUM_LETTERS_TO_FILTER = 3;

    class DropdownPopover extends bootstrap.Popover {
        constructor(...args) {
            const { dropdown } = args.pop();

            super(...args);

            this.dropdown = dropdown;
        }

        toggle(event) {
            if (event.target.classList.contains('ibexa-dropdown__remove-selection')) {
                this.dropdown.deselectOption(event.target.closest('.ibexa-dropdown__selected-item'));

                return;
            }

            super.toggle(event);
        }

        show() {
            if (this.dropdown.container.classList.contains('ibexa-dropdown--disabled')) {
                return;
            }

            super.show();
        }
    }
    class Dropdown {
        constructor(config = {}) {
            this.container = config.container.classList.contains('ibexa-dropdown')
                ? config.container
                : config.container.querySelector('.ibexa-dropdown');

            if (!this.container) {
                throw new Error('No valid container provided');
            }

            this.sourceInput = this.container.querySelector(config.selectorSource ?? '.ibexa-dropdown__source .ibexa-input');
            this.selectedItemsContainer = this.container.querySelector('.ibexa-dropdown__selection-info');
            this.itemsFixedWrapperContainer = this.container.querySelector('.ibexa-dropdown__items-fixed-wrapper');
            this.itemsContainer = this.container.querySelector('.ibexa-dropdown__items');
            this.itemsListContainer = this.itemsContainer.querySelector('.ibexa-dropdown__items-list');
            this.itemsFilterInput = this.itemsContainer.querySelector('.ibexa-dropdown__items-filter');

            this.isDynamic = this.container.classList.contains('ibexa-dropdown--dynamic');
            this.canSelectOnlyOne = !this.sourceInput?.multiple;
            this.selectedItemTemplate = this.selectedItemsContainer.dataset.template;

            this.createSelectedItem = this.createSelectedItem.bind(this);
            this.hideOptions = this.hideOptions.bind(this);
            this.fitItems = this.fitItems.bind(this);
            this.clearCurrentSelection = this.clearCurrentSelection.bind(this);
            this.onSelect = this.onSelect.bind(this);
            this.onInteractionOutside = this.onInteractionOutside.bind(this);
            this.onOptionClick = this.onOptionClick.bind(this);
            this.fireValueChangedEvent = this.fireValueChangedEvent.bind(this);
            this.filterItems = this.filterItems.bind(this);
            this.onPopoverShow = this.onPopoverShow.bind(this);
            this.onPopoverHide = this.onPopoverHide.bind(this);
            this.itemsPopoverContent = this.itemsPopoverContent.bind(this);

            ibexa.helpers.objectInstances.setInstance(this.container, this);
        }

        createSelectedItem(value, label) {
            return this.selectedItemTemplate.replace('{{ value }}', value).replace('{{ label }}', label);
        }

        clearCurrentSelection() {
            const overflowNumber = this.selectedItemsContainer.querySelector('.ibexa-dropdown__selected-overflow-number').cloneNode();

            this.sourceInput.querySelectorAll('option').forEach((option) => (option.selected = false));
            this.itemsListContainer
                .querySelectorAll('.ibexa-dropdown__item--selected')
                .forEach((option) => option.classList.remove('ibexa-dropdown__item--selected'));
            this.selectedItemsContainer.innerHTML = '';
            this.selectedItemsContainer.append(overflowNumber);
        }

        hideOptions() {
            doc.body.removeEventListener('click', this.onClickOutside);

            this.itemsPopover.hide();
        }

        selectFirstOption() {
            const firstOption = this.container.querySelector('.ibexa-dropdown__source option');

            return this.selectOption(firstOption.value, true);
        }

        selectOption(value) {
            const optionToSelect = this.itemsListContainer.querySelector(`.ibexa-dropdown__item[data-value="${value}"`);

            return this.onSelect(optionToSelect, true);
        }

        onSelect(element, selected) {
            const { value } = element.dataset;

            if (this.canSelectOnlyOne && selected) {
                this.hideOptions();
                this.clearCurrentSelection();
            }

            if (value) {
                this.sourceInput.querySelector(`[value="${value}"]`).selected = selected;

                if (!this.canSelectOnlyOne) {
                    element.querySelector('.ibexa-input').checked = selected;
                }
            }

            this.itemsListContainer.querySelector(`[data-value="${value}"]`).classList.toggle('ibexa-dropdown__item--selected', selected);

            const selectedItemsList = this.container.querySelector('.ibexa-dropdown__selection-info');

            if (selected) {
                const label = element.querySelector('.ibexa-dropdown__item-label').innerHTML;

                selectedItemsList
                    .querySelector('.ibexa-dropdown__selected-item--predefined')
                    .insertAdjacentHTML('beforebegin', this.createSelectedItem(value, label));
            } else {
                const valueNode = selectedItemsList.querySelector(`[data-value="${value}"]`);

                if (valueNode) {
                    valueNode.remove();
                }
            }

            this.fitItems();
            this.fireValueChangedEvent();
        }

        onInteractionOutside(event) {
            if (this.itemsPopover.tip.contains(event.target)) {
                return;
            }

            this.hideOptions();
        }

        fireValueChangedEvent() {
            this.sourceInput.dispatchEvent(new CustomEvent(EVENT_VALUE_CHANGED));
        }

        getItemsContainerHeight() {
            const DROPDOWN_MARGIN = 32;
            const documentElementHeight = global.innerHeight;
            const { top, bottom } = this.selectedItemsContainer.getBoundingClientRect();
            const topHeight = top;
            const bottomHeight = documentElementHeight - bottom;

            return Math.max(topHeight, bottomHeight) - DROPDOWN_MARGIN;
        }

        onPopoverShow() {
            doc.body.addEventListener('click', this.onInteractionOutside, false);
        }

        onPopoverHide() {
            doc.body.removeEventListener('click', this.onInteractionOutside, false);
        }

        onOptionClick({ target }) {
            const option = target.closest('.ibexa-dropdown__item');
            const isSelected = this.canSelectOnlyOne || !option.classList.contains('ibexa-dropdown__item--selected');

            return this.onSelect(option, isSelected);
        }

        deselectOption(option) {
            const { value } = option.dataset;
            const optionSelect = this.sourceInput.querySelector(`[value="${value}"]`);
            const itemSelected = this.itemsListContainer.querySelector(`[data-value="${value}"]`);

            itemSelected.classList.remove('ibexa-dropdown__item--selected');

            if (!this.canSelectOnlyOne) {
                itemSelected.querySelector('.ibexa-input').checked = false;
            }

            if (optionSelect) {
                optionSelect.selected = false;
            }

            option.remove();

            this.fitItems();
            this.fireValueChangedEvent();
        }

        fitItems() {
            if (this.canSelectOnlyOne) {
                return;
            }

            let itemsWidth = 0;
            let numberOfOverflowItems = 0;
            const selectedItems = this.selectedItemsContainer.querySelectorAll('.ibexa-dropdown__selected-item');
            const selectedItemsOverflow = this.selectedItemsContainer.querySelector('.ibexa-dropdown__selected-overflow-number');

            if (selectedItemsOverflow) {
                selectedItems.forEach((item) => {
                    item.hidden = false;
                });
                selectedItems.forEach((item, index) => {
                    const isOverflowNumber = item.classList.contains('ibexa-dropdown__selected-overflow-number');

                    itemsWidth += item.offsetWidth;

                    if (
                        !isOverflowNumber &&
                        index !== 0 &&
                        itemsWidth > this.selectedItemsContainer.offsetWidth - RESTRICTED_AREA_ITEMS_CONTAINER
                    ) {
                        const isPlaceholder = item.classList.contains('ibexa-dropdown__selected-placeholder');

                        item.hidden = true;

                        if (!isPlaceholder) {
                            numberOfOverflowItems++;
                        }
                    }
                });

                if (numberOfOverflowItems) {
                    selectedItemsOverflow.hidden = false;
                    selectedItemsOverflow.innerHTML = numberOfOverflowItems;
                    this.container.classList.add('ibexa-dropdown--overflow');
                } else {
                    selectedItemsOverflow.hidden = true;
                    this.container.classList.remove('ibexa-dropdown--overflow');
                }
            }
        }

        compareItem(itemFilterValue, searchedTerm) {
            const itemFilterValueLowerCase = itemFilterValue.toLowerCase();
            const searchedTermLowerCase = searchedTerm.toLowerCase();

            return itemFilterValueLowerCase.indexOf(searchedTermLowerCase) === 0;
        }

        filterItems(event) {
            const forceShowItems = event.currentTarget.value.length < MINIMUM_LETTERS_TO_FILTER;
            const allItems = [...this.itemsListContainer.querySelectorAll('[data-filter-value]')];
            const separator = this.itemsListContainer.querySelector('.ibexa-dropdown__separator');
            let hideSeparator = true;

            if (separator) {
                separator.setAttribute('hidden', 'hidden');
            }

            allItems.forEach((item) => {
                const isItemVisible = forceShowItems || this.compareItem(item.dataset.filterValue, event.currentTarget.value);
                const isPreferredChoice = item.classList.contains('ibexa-dropdown__item--preferred-choice');

                if (isPreferredChoice && isItemVisible) {
                    hideSeparator = false;
                }

                item.classList.toggle('ibexa-dropdown__item--hidden', !isItemVisible);
            });

            if (separator && !hideSeparator) {
                separator.removeAttribute('hidden');
            }
        }

        itemsPopoverContent() {
            const { width } = this.selectedItemsContainer.getBoundingClientRect();

            this.itemsContainer.style['max-height'] = `${this.getItemsContainerHeight()}px`;
            this.itemsContainer.style.width = `${width}px`;

            return this.itemsContainer;
        }

        init() {
            if (this.container.dataset.initialized) {
                console.warn('Dropdown has already been initialized!');

                return;
            }

            this.container.dataset.initialized = true;

            const optionsCount = this.container.querySelectorAll('.ibexa-dropdown__source option').length;

            if (!optionsCount) {
                return;
            }

            this.itemsPopover = new DropdownPopover(
                this.selectedItemsContainer,
                {
                    html: true,
                    placement: 'bottom',
                    customClass: 'ibexa-dropdown-popover',
                    content: this.itemsPopoverContent,
                    container: 'body',
                },
                { dropdown: this },
            );
            this.itemsPopover._element.removeAttribute('data-bs-original-title');
            this.itemsPopover._element.removeAttribute('title');

            if (this.isDynamic) {
                this.selectFirstOption();
            }

            this.hideOptions();
            this.fitItems();

            this.itemsPopover._element.addEventListener('shown.bs.popover', this.onPopoverShow);
            this.itemsPopover._element.addEventListener('hidden.bs.popover', this.onPopoverHide);
            this.itemsListContainer
                .querySelectorAll('.ibexa-dropdown__item:not([disabled])')
                .forEach((option) => option.addEventListener('click', this.onOptionClick, false));

            if (this.itemsFilterInput) {
                this.itemsFilterInput.addEventListener('keyup', this.filterItems, false);
                this.itemsFilterInput.addEventListener('input', this.filterItems, false);
            }
        }
    }

    ibexa.addConfig('core.Dropdown', Dropdown);
})(window, window.document, window.ibexa, window.bootstrap);
