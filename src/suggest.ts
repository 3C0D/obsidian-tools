import { App, ISuggestOwner, Scope, SuggestModal } from 'obsidian';
import { createPopper, Instance as PopperInstance } from '@popperjs/core';
import { TAbstractFile, TFolder } from 'obsidian';
import { getVaultPaths } from './utils';

const wrapAround = (value: number, size: number): number => {
    return ((value % size) + size) % size;
};

class Suggest<T> {
    private owner: ISuggestOwner<T>;
    private values: T[];
    private suggestions: HTMLDivElement[];
    private selectedItem: number;
    private containerEl: HTMLElement;

    constructor(
        owner: ISuggestOwner<T>,
        containerEl: HTMLElement,
        scope: Scope
    ) {
        this.owner = owner;
        this.containerEl = containerEl;

        containerEl.on(
            'click',
            '.suggestion-item',
            this.onSuggestionClick.bind(this)
        );
        containerEl.on(
            'mousemove',
            '.suggestion-item',
            this.onSuggestionMouseover.bind(this)
        );

        scope.register([], 'ArrowUp', (event) => {
            if (!event.isComposing) {
                this.setSelectedItem(this.selectedItem - 1, true);
                return false;
            }
        });

        scope.register([], 'ArrowDown', (event) => {
            if (!event.isComposing) {
                this.setSelectedItem(this.selectedItem + 1, true);
                return false;
            }
        });

        scope.register([], 'Enter', (event) => {
            if (!event.isComposing) {
                this.useSelectedItem(event);
                return false;
            }
        });
    }

    onSuggestionClick(event: MouseEvent, el: HTMLDivElement): void {
        event.preventDefault();

        const item = this.suggestions.indexOf(el);
        this.setSelectedItem(item, false);
        this.useSelectedItem(event);
    }

    onSuggestionMouseover(_event: MouseEvent, el: HTMLDivElement): void {
        const item = this.suggestions.indexOf(el);
        this.setSelectedItem(item, false);
    }

    setSuggestions(values: T[]) {
        this.containerEl.empty();
        const suggestionEls: HTMLDivElement[] = [];

        values.forEach((value) => {
            const suggestionEl = this.containerEl.createDiv('suggestion-item');
            this.owner.renderSuggestion(value, suggestionEl);
            suggestionEls.push(suggestionEl);
        });

        this.values = values;
        this.suggestions = suggestionEls;
        this.setSelectedItem(0, false);
    }

    useSelectedItem(event: MouseEvent | KeyboardEvent) {
        const currentValue = this.values[this.selectedItem];
        if (currentValue) {
            this.owner.selectSuggestion(currentValue, event);
        }
    }

    setSelectedItem(selectedIndex: number, scrollIntoView: boolean) {
        const normalizedIndex = wrapAround(
            selectedIndex,
            this.suggestions.length
        );
        const prevSelectedSuggestion = this.suggestions[this.selectedItem];
        const selectedSuggestion = this.suggestions[normalizedIndex];

        prevSelectedSuggestion?.removeClass('is-selected');
        selectedSuggestion?.addClass('is-selected');

        this.selectedItem = normalizedIndex;

        if (scrollIntoView) {
            selectedSuggestion.scrollIntoView(false);
        }
    }
}

abstract class TextInputSuggest<T> implements ISuggestOwner<T> {
    protected app: App;
    protected inputEl: HTMLInputElement | HTMLTextAreaElement;

    private popper: PopperInstance;
    private scope: Scope;
    private suggestEl: HTMLElement;
    private suggest: Suggest<T>;

    constructor(app: App, inputEl: HTMLInputElement | HTMLTextAreaElement) {
        this.app = app;
        this.inputEl = inputEl;
        this.scope = new Scope();

        this.suggestEl = createDiv('suggestion-container');
        const suggestion = this.suggestEl.createDiv('suggestion');
        this.suggest = new Suggest(this, suggestion, this.scope);

        this.scope.register([], 'Escape', this.close.bind(this));

        this.inputEl.addEventListener('input', this.onInputChanged.bind(this));
        this.inputEl.addEventListener('focus', this.onInputChanged.bind(this));
        this.inputEl.addEventListener('blur', this.close.bind(this));
        this.suggestEl.on(
            'mousedown',
            '.suggestion-container',
            (event: MouseEvent) => {
                event.preventDefault();
            }
        );
    }

    onInputChanged(): void {
        const inputStr = this.inputEl.value;
        const suggestions = this.getSuggestions(inputStr);

        if (!suggestions) {
            this.close();
            return;
        }

        if (suggestions.length > 0) {
            this.suggest.setSuggestions(suggestions);
            this.open(this.app.dom.appContainerEl, this.inputEl);
        } else {
            this.close();
        }
    }

    open(container: HTMLElement, inputEl: HTMLElement): void {
        (this.app.keymap.pushScope(this.scope));

        container.appendChild(this.suggestEl);
        this.popper = createPopper(inputEl, this.suggestEl, {
            placement: 'bottom-start',
            modifiers: [
                {
                    name: 'sameWidth',
                    enabled: true,
                    fn: ({ state, instance }) => {
                        // Note: positioning needs to be calculated twice -
                        // first pass - positioning it according to the width of the popper
                        // second pass - position it with the width bound to the reference element
                        // we need to early exit to avoid an infinite loop
                        const targetWidth = `${state.rects.reference.width}px`;
                        if (state.styles.popper.width === targetWidth) {
                            return;
                        }
                        state.styles.popper.width = targetWidth;
                        instance.update();
                    },
                    phase: 'beforeWrite',
                    requires: ['computeStyles'],
                },
            ],
        });
    }

    close(): void {
        this.app.keymap.popScope(this.scope);

        this.suggest.setSuggestions([]);
        if (this.popper) this.popper.destroy();
        this.suggestEl.detach();
    }

    abstract getSuggestions(_inputStr: string): T[];
    abstract renderSuggestion(_item: T, _el: HTMLElement): void;
    abstract selectSuggestion(_item: T): void;
}

export class FolderSuggest extends TextInputSuggest<TFolder> {
    getSuggestions(inputStr: string): TFolder[] {
        const abstractFiles = this.app.vault.getAllLoadedFiles();
        const folders: TFolder[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();

        abstractFiles.forEach((folder: TAbstractFile) => {
            if (
                folder instanceof TFolder &&
                folder.path.toLowerCase().contains(lowerCaseInputStr)
            ) {
                folders.push(folder);
            }
        });

        return folders;
    }

    renderSuggestion(file: TFolder, el: HTMLElement): void {
        el.setText(file.path);
    }

    selectSuggestion(file: TFolder): void {
        this.inputEl.value = file.path;
        this.inputEl.trigger('input');
        this.close();
    }
}

// Not used. I let it for example
export class VaultsSuggest extends SuggestModal<string> {
    getSuggestions(query: string): string[] {
        const paths = getVaultPaths(this.app)
        return paths.filter((path) =>
            path.toLowerCase().includes(query.toLowerCase()))
    }

    renderSuggestion(path: string, el: HTMLElement) {
        el.createEl("div", { text: path });
    }

    onChooseSuggestion(path: string, evt: MouseEvent | KeyboardEvent) {
        return path
    }
}