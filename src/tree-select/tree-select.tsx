import { defineComponent, VNode } from 'vue';
import isArray from 'lodash/isArray';
import isEmpty from 'lodash/isEmpty';
import isNumber from 'lodash/isNumber';
import isString from 'lodash/isString';
import isBoolean from 'lodash/isBoolean';
import isObject from 'lodash/isObject';
import isFunction from 'lodash/isFunction';
import mixins from '../utils/mixins';
import getLocalReceiverMixins from '../locale/local-receiver';
import { renderTNodeJSX } from '../utils/render-tnode';

import Popup, { PopupProps } from '../popup';
import IconCloseCircleFilled from '../icon/close-circle-filled';
import IconLoading from '../icon/loading';
import Tag from '../tag';
import Tree, { TreeNodeModel, TreeNodeValue } from '../tree';
import Input, { InputValue } from '../input';

import CLASSNAMES from '../utils/classnames';
import props from './props';

import { TreeSelectValue } from './type';
import { ClassName, TreeOptionData } from '../common';
import { prefix } from '../config';

import { RemoveOptions } from './interface';

const name = `${prefix}-tree-select`;

export default defineComponent({
  ...mixins(getLocalReceiverMixins('treeSelect')),
  name,
  props,
  emits: ['change', 'clear', 'focus', 'blur', 'remove', 'search'],
  data() {
    return {
      visible: false,
      isHover: false,
      focusing: false,
      defaultProps: {
        trigger: 'click',
        placement: 'bottom-left',
        overlayClassName: '',
        overlayStyle: (trigger) => ({
          width: `${trigger.offsetWidth}px`,
          border: '1px solid #dcdcdc',
        }),
      } as PopupProps,
      filterText: '',
      filterByText: null,
      actived: [],
      expanded: [],
      nodeInfo: null,
    };
  },
  computed: {
    classes(): ClassName {
      return [
        `${prefix}-select`,
        {
          [CLASSNAMES.STATUS.disabled]: this.disabled,
          [CLASSNAMES.STATUS.active]: this.visible,
          [CLASSNAMES.SIZE[this.size]]: this.size,
          [`${prefix}-has-prefix`]: this.prefixIconSlot,
          [`${prefix}-select-selected`]: this.selectedSingle || !isEmpty(this.selectedMultiple),
        },
      ];
    },
    popupClass(): ClassName {
      const { popupObject } = this;
      return `${popupObject.overlayClassName} ${prefix}-select-dropdown narrow-scrollbar`;
    },
    arrowClass(): ClassName {
      return [
        `${prefix}-select-right-icon`,
        `${prefix}-fake-arrow`,
        {
          [`${prefix}-fake-arrow--active`]: this.visible,
        },
      ];
    },
    isObjectValue(): boolean {
      return this.valueType === 'object';
    },
    checked(): Array<TreeSelectValue> {
      if (this.multiple) {
        if (this.isObjectValue) {
          return isArray(this.value) ? this.value.map((item) => item.value) : [];
        }
        return isArray(this.value) ? this.value : [];
      }
      return [];
    },
    showArrow(): boolean {
      return (
        !this.clearable
        || !this.isHover
        || this.disabled
        || (!this.multiple && !this.value && this.value !== 0)
        || (this.multiple && isArray(this.value) && isEmpty(this.value))
      );
    },
    showLoading(): boolean {
      return this.loading && !this.disabled;
    },
    showClose(): boolean {
      return (
        this.clearable
        && this.isHover
        && !this.disabled
        && ((!this.multiple && (!!this.value || this.value === 0)) || (this.multiple && !isEmpty(this.value as Array<TreeSelectValue>)))
      );
    },
    showPlaceholder(): boolean {
      if (
        !this.showFilter
        && ((isString(this.value) && this.value === '' && !this.selectedSingle)
        || (isArray(this.value) && isEmpty(this.value))
        || this.value === null)
      ) {
        return true;
      }
      return false;
    },
    showFilter(): boolean {
      if (this.disabled) {
        return false;
      }
      if (!this.multiple && this.selectedSingle && (this.filterable || isFunction(this.filter))) {
        return this.visible;
      }
      return this.filterable || isFunction(this.filter);
    },
    showTree(): boolean {
      return !this.loading;
    },
    popupObject(): PopupProps {
      const propsObject = this.popupProps ? ({ ...this.defaultProps, ...(this.popupProps as any) }) : this.defaultProps;
      return propsObject;
    },
    selectedSingle(): string {
      if (!this.multiple && (isString(this.value) || isNumber(this.value) || isObject(this.value))) {
        if (this.nodeInfo) {
          return this.nodeInfo.label;
        }
        return `${this.value}`;
      }
      return '';
    },
    selectedMultiple(): Array<TreeSelectValue> {
      if (this.multiple && isArray(this.value) && !isEmpty(this.value)) {
        return this.value;
      }
      return [];
    },
    multiLimitDisabled() {
      if (this.multiple && this.max && isArray(this.value) && this.max <= this.value.length) {
        return true;
      }
      return false;
    },
    filterPlaceholder(): string {
      if (this.multiple && isArray(this.value) && !isEmpty(this.value)) {
        return '';
      }
      if (!this.multiple && this.selectedSingle) {
        return this.selectedSingle;
      }
      return this.placeholder;
    },
    loadingTextSlot(): VNode {
      const useLocale = !this.loadingText && !this.$slots.loadingText;
      return useLocale
        ? <div class={`${prefix}-select-empty`}>{ this.t(this.locale.loadingText) }</div>
        : renderTNodeJSX(this, 'loadingText');
    },
    emptySlot(): VNode {
      const useLocale = !this.empty && !this.$slots.empty;
      return useLocale
        ? <div class={`${prefix}-select-empty`}>{ this.t(this.locale.empty) }</div>
        : renderTNodeJSX(this, 'empty');
    },
    prefixIconSlot(): VNode {
      return renderTNodeJSX(this, 'prefixIcon');
    },
    realLabel(): string {
      const { treeProps } = this;
      if (!isEmpty(treeProps) && !isEmpty((treeProps as any).keys)) {
        return (treeProps as any).keys.label || 'label';
      }
      return 'label';
    },
    realValue(): string {
      const { treeProps } = this;
      if (!isEmpty(treeProps) && !isEmpty((treeProps as any).keys)) {
        return (treeProps as any).keys.value || 'value';
      }
      return 'value';
    },
    tagList(): Array<TreeSelectValue> {
      if (this.nodeInfo && isArray(this.nodeInfo)) {
        return this.nodeInfo.map((node) => node.label);
      }
      return this.isObjectValue ? [] : this.selectedMultiple;
    },
  },
  async mounted() {
    if (!this.value && this.defaultValue) {
      await this.change(this.defaultValue, null);
    }
    if (this.isObjectValue) {
      this.actived = isArray(this.value) ? this.value.map((item) => item.value) : [(this.value as {label: string; value: string|number}).value];
    } else {
      this.actived = isArray(this.value) ? this.value : [this.value];
    }
    this.changeNodeInfo();
  },
  methods: {
    async popupVisibleChange(visible: boolean) {
      if (this.focusing && !visible) {
        this.visible = true;
        return;
      }
      await (this.visible = visible);
      if (this.showFilter && this.visible) {
        const searchInput = this.$refs.input as HTMLElement;
        searchInput?.focus();
        this.focusing = true;
      }
    },
    removeTag(index: number, data: TreeOptionData, e: MouseEvent) {
      if (this.disabled) {
        return;
      }
      this.remove({ value: this.value[index], data, e });
      isArray(this.value) && this.value.splice(index, 1);
      this.change(this.value, null);
    },
    change(value: TreeSelectValue, node: TreeNodeModel<TreeOptionData>) {
      this.$emit('change', value, { node });
      isFunction(this.onChange) && this.onChange(value, { node });
      this.changeNodeInfo();
    },
    clear(e: MouseEvent) {
      const defaultValue: TreeSelectValue = this.multiple ? [] : '';
      this.change(defaultValue, null);
      this.actived = [];
      this.filterText = '';
      this.$emit('clear', { e });
      isFunction(this.onClear) && this.onClear({ e });
    },
    focus(value: InputValue, context: { e: FocusEvent }) {
      this.focusing = true;
      this.$emit('focus', { value: this.value, e: context.e });
      isFunction(this.onFocus) && this.onFocus({ e: context.e });
    },
    blur(value: InputValue, context: { e: FocusEvent }) {
      this.focusing = false;
      this.filterText = '';
      this.$emit('blur', { value: this.value, e: context.e });
      isFunction(this.onBlur) && this.onBlur({ value: this.value, e: context.e });
    },
    remove(options: RemoveOptions<TreeOptionData>) {
      this.$emit('remove', options);
      isFunction(this.onRemove) && this.onRemove(options);
    },
    search(filterWords: string) {
      this.$emit('search', filterWords);
      isFunction(this.onSearch) && this.onSearch(filterWords);
    },
    treeNodeChange(value: Array<TreeNodeValue>, context: { node: TreeNodeModel<TreeOptionData>; e: MouseEvent }) {
      let current: TreeSelectValue = value;
      if (this.isObjectValue) {
        const { tree } = this.$refs;
        current = value.map((nodeValue) => {
          const node = (tree as any).getItem(nodeValue);
          return { label: node.data[this.realLabel], value: node.data[this.realValue] };
        });
      }
      this.change(current, context.node);
      this.actived = value;
    },
    treeNodeActive(value: Array<TreeNodeValue>, context: { node: TreeNodeModel<TreeOptionData>; e: MouseEvent }) {
      // 多选模式屏蔽 Active 事件
      if (this.multiple) {
        return;
      }
      let current: TreeSelectValue = value;
      if (this.isObjectValue) {
        const { tree } = this.$refs;
        const nodeValue = isEmpty(value) ? '' : value[0];
        const node = (tree as any).getItem(nodeValue);
        current = { label: node.data[this.realLabel], value: node.data[this.realValue] };
      } else {
        current = isEmpty(value) ? '' : value[0];
      }
      this.change(current, context.node);
      this.actived = value;
      this.visible = false;
    },
    treeNodeExpand(value: Array<TreeNodeValue>) {
      this.expanded = value;
    },
    onInput() {
      this.filterByText = (node: TreeNodeModel<TreeOptionData>) => {
        if (isFunction(this.filter)) {
          const filter: boolean | Promise<boolean> = this.filter(this.filterText, node);
          if (isBoolean(filter)) {
            return filter;
          }
        }
        return node.data[this.realLabel].indexOf(this.filterText) >= 0;
      };
      this.search(this.filterText);
    },
    async changeNodeInfo() {
      const { tree } = this.$refs;
      await this.value;

      if (tree && !this.multiple && this.value) {
        const nodeValue = this.isObjectValue ? (this.value as {label: string; value: string|number}).value : this.value;
        const node = (tree as any).getItem(nodeValue);
        this.nodeInfo = { label: node.data[this.realLabel], value: node.data[this.realValue] };
      } else if (tree && this.multiple && isArray(this.value)) {
        this.nodeInfo = this.value.map((value) => {
          const nodeValue = this.isObjectValue ? (value as {label: string; value: string|number}).value : value;
          const node = (tree as any).getItem(nodeValue);
          return { label: node.data[this.realLabel], value: node.data[this.realValue] };
        });
      } else {
        this.nodeInfo = null;
      }
    },
  },
  render(): VNode {
    const {
      treeProps, popupObject, classes, popupClass, arrowClass,
    } = this;
    const iconStyle = { 'font-size': this.size };
    const treeSlots = {
      empty: () => (
        <>
          {this.emptySlot}
        </>
      ),
    };
    const treeItem = (
      <Tree
        ref="tree"
        v-show={this.showTree}
        value={this.checked}
        hover
        expandAll
        expandOnClickNode
        data={this.data}
        activable={!this.multiple}
        checkable={this.multiple}
        disabled={this.disabled || this.multiLimitDisabled}
        empty={this.empty}
        size={this.size}
        filter={this.filterByText}
        actived={this.actived}
        expanded={this.expanded}
        activeMultiple={this.multiple}
        onChange={this.treeNodeChange}
        onActive={this.treeNodeActive}
        onExpand={this.treeNodeExpand}
        v-slots={treeSlots}
        {...treeProps}
      />
    );
    const searchInput = (
      <Input
        ref="input"
        v-show={this.showFilter}
        v-model={this.filterText}
        class={`${prefix}-select-input`}
        size={this.size}
        disabled={this.disabled}
        placeholder={this.filterPlaceholder}
        onInput={this.onInput}
        onBlur={this.blur}
        onFocus={this.focus}
      />
    );
    const tagItem = (
      this.tagList.map((label, index) => (
        <Tag
          key={index}
          size={this.size}
          closable={!this.disabled}
          disabled={this.disabled}
          onClose={(context: { e: MouseEvent }) => this.removeTag(index, null, context.e)}
        >
          {label}
        </Tag>
      ))
    );
    const slots = {
      content: () => (
        <>
          <p v-show={this.showLoading} class={`${prefix}-select-loading-tips`}>
            {this.loadingTextSlot}
          </p>
          {treeItem}
        </>
      ),
    };
    return (
      <div ref='treeSelect'>
        <Popup
          ref="popup"
          class={`${prefix}-select-popup-reference`}
          visible={this.visible}
          disabled={this.disabled}
          placement={popupObject.placement}
          trigger={popupObject.trigger}
          overlayStyle={popupObject.overlayStyle}
          overlayClassName={popupClass}
          onVisibleChange={this.popupVisibleChange}
          expandAnimation={true}
          v-slots={slots}
        >
          <div
            class={classes}
            onmouseenter={() => this.isHover = true}
            onmouseleave={() => this.isHover = false}
          >
            {
              this.prefixIconSlot && (<span class={`${prefix}-select-left-icon`}>{this.prefixIconSlot[0]}</span>)
            }
            <span v-show={this.showPlaceholder} class={`${prefix}-select-placeholder`}>{this.placeholder}</span>
            {tagItem}
            {
              !this.multiple && !this.showPlaceholder && !this.showFilter && (
                <span title={this.selectedSingle} class={`${prefix}-select-selectedSingle`}>{this.selectedSingle}</span>
              )
            }
            {searchInput}
            {
              this.showArrow && !this.showLoading && (
                <svg class={arrowClass} style={iconStyle} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.75 5.7998L7.99274 10.0425L12.2361 5.79921" stroke="black" stroke-opacity="0.9" stroke-width="1.3"/>
                </svg>
              )
            }
            <IconCloseCircleFilled v-show={this.showClose && !this.showLoading} name="close" class={`${prefix}-select-right-icon`} size={this.size} onClick={(e: PointerEvent) => this.clear(e)} />
            <IconLoading v-show={this.showLoading} name="loading" class={`${prefix}-select-right-icon ${prefix}-select-active-icon`} size={this.size} />
          </div>
        </Popup>
      </div>
    );
  },
});