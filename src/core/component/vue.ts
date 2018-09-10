/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import Async from 'core/async';
import Vue, { ComponentOptions, WatchOptions, WatchOptionsWithHandler, VNode, CreateElement } from 'vue';
import { ScopedSlot } from 'vue/types/vnode';
import { ComponentMeta, Hooks } from 'core/component';

// tslint:disable:no-empty
// tslint:disable:typedef

export type VueElement<T> = Element & {vueComponent?: T};
export default class VueInterface<
	C extends VueInterface = VueInterface<any, any>,
	R extends VueInterface = VueInterface<any, any>
> {
	readonly hook!: Hooks;
	readonly instance!: this;
	readonly componentName!: string;
	readonly keepAlive!: boolean;
	readonly $el!: VueElement<C>;
	readonly $options!: ComponentOptions<Vue>;
	readonly $props!: Dictionary;
	readonly $children?: C[];
	readonly $parent?: C;
	readonly $normalParent?: C;
	readonly $root!: R | any;
	readonly $isServer!: boolean;
	protected readonly $async!: Async<VueInterface>;
	protected readonly meta!: ComponentMeta;
	protected readonly $refs!: Dictionary;
	protected readonly $slots!: Dictionary<VNode>;
	protected readonly $scopedSlots!: Dictionary<ScopedSlot>;
	protected readonly $data!: Dictionary;
	protected readonly $$data!: Dictionary;
	protected readonly $ssrContext!: any;
	protected readonly $vnode!: VNode;
	protected readonly $attrs!: Dictionary<string>;
	protected readonly $listeners!: Dictionary<Function | Function[]>;
	protected readonly $activeField!: string;
	protected $createElement!: CreateElement;

	protected log?(key: string, ...details: any[]): void;

	// @ts-ignore
	protected $mount(elementOrSelector?: Element | string, hydrating?: boolean): this;
	protected $mount() {}

	protected $forceUpdate(): void {}
	protected $destroy(): void {}

	protected $set<T>(object: object, key: string, value: T): T;
	protected $set<T>(array: T[], key: number, value: T): T;
	// tslint:disable-next-line
	protected $set() {}

	protected $delete(object: object, key: string): void;
	protected $delete<T>(array: T[], key: number): void;
	// tslint:disable-next-line
	protected $delete() {}

	// @ts-ignore
	protected $watch<T = any>(
		exprOrFn: string | ((this: this) => string),
		cb: (this: this, n: T, o?: T) => void,
		opts?: WatchOptions
	): Function;

	// @ts-ignore
	protected $watch<T = any>(
		exprOrFn: string | ((this: this) => string),
		opts: WatchOptionsWithHandler<T>
	): Function;

	// tslint:disable-next-line
	protected $watch() {}

	// @ts-ignore
	protected $on(event: string | string[], cb: Function): this;
	// tslint:disable-next-line
	protected $on() {}

	// @ts-ignore
	protected $once(event: string, cb: Function): this;
	// tslint:disable-next-line
	protected $once() {}

	// @ts-ignore
	protected $off(event?: string | string[], cb?: Function): this;
	// tslint:disable-next-line
	protected $off() {}

	// @ts-ignore
	protected $emit(event: string, ...args: any[]): this;
	// tslint:disable-next-line
	protected $emit() {}

	protected $nextTick(cb: (this: this) => void): void;
	// @ts-ignore
	protected $nextTick(): Promise<void>;
	// tslint:disable-next-line
	protected $nextTick() {}
}