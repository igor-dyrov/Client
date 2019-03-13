/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import symbolGenerator from 'core/symbol';
import Async from 'core/async';

import { EventEmitter2 as EventEmitter } from 'eventemitter2';
import { FunctionalCtx } from 'core/component/interface';
import { addDirectives } from 'core/component/create/directive';

import {

	patchVNode as patch,
	VNode,
	CreateElement,
	RenderContext as BaseRenderContext,
	FunctionalComponentOptions,
	WatchOptions,
	WatchOptionsWithHandler

} from 'core/component/engines';

import {

	runHook,
	createMeta,
	initDataObject,
	initPropsObject,
	bindWatchers,
	addEventAPI,
	addMethodsFromMeta,
	addElAccessor,
	getNormalParent

} from 'core/component/create/helpers';

export interface RenderContext extends BaseRenderContext {
	$root?: FunctionalCtx;
	$options?: Dictionary;
}

export interface RenderObject {
	staticRenderFns?: Function[];
	render(el: CreateElement, ctx?: RenderContext): VNode;
}

const
	$$ = symbolGenerator(),
	cache = new WeakMap();

export const
	CTX = $$.ctx;

const customOpts = [
	'filters',
	'directives',
	'components'
];

const destroyCheckHooks = [
	'mounted',
	'created',
	'beforeDestroy'
];

const destroyHooks = [
	'beforeDestroy',
	'destroyed'
];

const mountHooks = [
	'mounted',
	'updated',
	'activated'
];

const parentMountMap = {
	beforeMount: 'mounted',
	beforeUpdate: 'updated',
	deactivated: 'activated'
};

/**
 * Generates a fake context for a function component
 *
 * @param createElement - create element function
 * @param renderCtx - render context
 * @param baseCtx - base component context (methods, accessors, etc.)
 * @param [initProps] - if true, then component prop values will be force initialize
 */
export function createFakeCtx<T extends Dictionary = FunctionalCtx>(
	createElement: CreateElement,
	renderCtx: RenderContext,
	baseCtx: FunctionalCtx,
	initProps?: boolean
): T {
	const
		fakeCtx = Object.create(baseCtx),
		meta = createMeta(fakeCtx.meta);

	const
		{instance} = fakeCtx,
		{methods, component} = meta;

	const
		p = <Dictionary<any>>renderCtx.parent,
		data = {};

	const
		$w = new EventEmitter({maxListeners: 1e3}),
		$a = new Async(this);

	const
		{children, data: opts} = renderCtx;

	let
		$options;

	if (p && p.$options) {
		const {filters, directives, components} = p.$options;
		$options = {filters: {...filters}, directives: {...directives}, components: {...components}};

	} else {
		$options = {filters: {}, directives: {}, components: {}};
	}

	if (component) {
		Object.assign($options, Object.reject(component, customOpts));
		Object.assign($options.filters, component.filters);
		Object.assign($options.directives, component.directives);
		Object.assign($options.components, component.components);
	}

	if (renderCtx.$options) {
		const o = renderCtx.$options;
		Object.assign($options, Object.reject(o, customOpts));
		Object.assign($options.filters, o.filters);
		Object.assign($options.directives, o.directives);
		Object.assign($options.components, o.components);
	}

	// Add base methods and properties
	Object.assign(fakeCtx, renderCtx.props, {
		_self: fakeCtx,
		_renderProxy: fakeCtx,
		_staticTrees: [],

		meta,
		children: children || [],

		$parent: p,
		$root: renderCtx.$root || p && p.$root,
		$options,

		$async: $a,
		$createElement: createElement.bind(fakeCtx),

		$data: data,
		$$data: data,
		$dataCache: {},

		$props: renderCtx.props || {},
		$attrs: opts && opts.attrs || {},

		$listeners: renderCtx.listeners || opts && opts.on || {},
		$refs: {},

		$slots: {
			default: children && children.length ? children : undefined,
			...renderCtx.slots && renderCtx.slots()
		},

		$scopedSlots: {
			...Object.isFunction(renderCtx.scopedSlots) ? renderCtx.scopedSlots() : renderCtx.scopedSlots
		},

		$destroy(): void {
			if (fakeCtx.componentStatus === 'destroyed') {
				return;
			}

			$a.clearAll().locked = true;

			if (this.$normalParent) {
				const
					// @ts-ignore
					hooks = $normalParent.meta.hooks;

				for (let o = destroyCheckHooks, i = 0; i < o.length; i++) {
					const
						hook = o[i],
						filteredHooks = <unknown[]>[];

					for (let list = hooks[hook], j = 0; j < list.length; j++) {
						const
							el = list[j];

						if (el.fn[$$.self] !== fakeCtx) {
							filteredHooks.push(el);
						}
					}

					hooks[hook] = filteredHooks;
				}
			}

			for (let o = destroyHooks, i = 0; i < o.length; i++) {
				const
					key = o[i];

				runHook(key, meta, fakeCtx).then(() => {
					const
						m = methods[key];

					if (m) {
						return m.fn.call(fakeCtx);
					}
				}, stderr);
			}
		},

		$nextTick(cb?: () => void): Promise<void> | void {
			if (cb) {
				$a.setImmediate(cb);
				return;
			}

			return $a.nextTick();
		},

		$forceUpdate(): void {
			if (!Object.isFunction(p.$forceUpdate)) {
				return;
			}

			$a.setImmediate(() => p.$forceUpdate(), {
				label: $$.forceUpdate
			});
		},

		$watch(
			exprOrFn: string | (() => string),
			cbOrOpts: (n: any, o: any) => void | WatchOptionsWithHandler<any>,
			opts?: WatchOptions
		): (() => void) {
			let
				cb = cbOrOpts;

			if (Object.isObject(cbOrOpts)) {
				cb = (<any>cbOrOpts).handler;
				opts = <any>cbOrOpts;
			}

			const
				expr = Object.isFunction(exprOrFn) ? exprOrFn.call(this) : exprOrFn;

			cb = cb.bind(this);
			$w.on(expr, cb);

			if (opts && opts.immediate) {
				$w.emit(expr, this.field.get(expr));
			}

			return () => $w.off(expr, cb);
		},

		$set(obj: object, key: string, value: any): any {
			obj[key] = value;
			return value;
		},

		$delete(obj: object, key: string): void {
			delete obj[key];
		}
	});

	fakeCtx.$normalParent = getNormalParent(fakeCtx);
	addEventAPI(fakeCtx);

	if (!fakeCtx.$root) {
		fakeCtx.$root = fakeCtx;
	}

	addMethodsFromMeta(meta, fakeCtx);

	if (!('$el' in fakeCtx)) {
		addElAccessor($$.el, fakeCtx);
	}

	runHook('beforeRuntime', meta, fakeCtx)
		.catch(stderr);

	initPropsObject(meta.component.props, fakeCtx, instance, fakeCtx, initProps);
	initDataObject(meta.systemFields, fakeCtx, instance, fakeCtx);

	runHook('beforeCreate', meta, fakeCtx).then(() => {
		if (methods.beforeCreate) {
			return methods.beforeCreate.fn.call(fakeCtx);
		}
	}, stderr);

	bindWatchers(<any>fakeCtx);
	initDataObject(meta.fields, fakeCtx, instance, data);

	runHook('beforeDataCreate', meta, fakeCtx)
		.catch(stderr);

	if (meta.params.tiny) {
		Object.assign(fakeCtx, data);

	} else {
		for (let keys = Object.keys(data), i = 0; i < keys.length; i++) {
			const
				key = keys[i];

			Object.defineProperty(fakeCtx, key, {
				get(): any {
					return data[key];
				},

				set(val: any): void {
					fakeCtx.$dataCache[key] = true;

					const
						old = data[key];

					if (val !== old) {
						data[key] = val;
						$w.emit(key, val, old);
					}
				}
			});
		}
	}

	fakeCtx.$$data = fakeCtx;
	return fakeCtx;
}

/**
 * Patches the specified virtual node: add classes, event handlers, etc.
 *
 * @param vnode
 * @param ctx - component fake context
 * @param renderCtx - render context
 */
export function patchVNode(vnode: VNode, ctx: Dictionary<any>, renderCtx: RenderContext): VNode {
	const
		{data} = renderCtx,
		{meta, meta: {methods}} = ctx;

	patch(
		vnode,
		ctx,
		renderCtx
	);

	// Event handlers

	if (data.on) {
		for (let o = data.on, keys = Object.keys(o), i = 0; i < keys.length; i++) {
			const
				key = keys[i],
				fns = (<Function[]>[]).concat(o[key]);

			for (let i = 0; i < fns.length; i++) {
				const
					fn = fns[i];

				if (Object.isFunction(fn)) {
					ctx.$on(key, fn);
				}
			}
		}
	}

	runHook('created', meta, ctx).then(() => {
		if (methods.created) {
			return methods.created.fn.call(ctx);
		}
	}, stderr);

	const
		p = ctx.$normalParent,
		hooks = p.meta.hooks;

	let
		destroyed;

	const destroy = () => {
		ctx.$destroy();
		destroyed = true;
	};

	destroy[$$.self] = ctx;
	hooks.beforeDestroy.unshift({fn: destroy});

	const
		mountedHooks = meta.hooks.mounted;

	/*if (!ctx.mounted && (mountedHooks.length > 1 || mountedHooks[0] && mountedHooks[0].name === 'initBlockInstance')) {
		ctx.localEvent.emit('block.ready');
		return vnode;
	}*/

	// tslint:disable-next-line:cyclomatic-complexity
	const mount = (retry?) => {
		if (ctx.hook === 'mounted') {
			if (!ctx.keepAlive && !ctx.$el) {
				destroy();
			}

			return;
		}

		if (destroyed || ctx.hook !== 'created') {
			return;
		}

		ctx[<any>$$.el] = undefined;

		if (!ctx.$el) {
			if (retry) {
				return;
			}

			return ctx.$async.promise(p.nextTick(), {
				label: $$.findElWait
			}).then(() => mount(true), stderr);
		}

		const
			el = ctx.$el;

		let
			oldCtx = el.component;

		if (oldCtx) {
			if (oldCtx === ctx) {
				return;
			}

			if (ctx.componentName !== oldCtx.componentName) {
				oldCtx = undefined;
				delete el.component;
			}
		}

		addDirectives(<any>ctx, el, data, data.directives);
		oldCtx && oldCtx.$destroy();

		if (!meta.params.tiny && oldCtx) {
			const
				props = ctx.$props,
				oldProps = oldCtx.$props,
				linkedFields = <Dictionary<string>>{};

			for (let keys = Object.keys(oldProps), i = 0; i < keys.length; i++) {
				const
					key = keys[i],
					linked = oldCtx.syncLinkCache[key];

				if (linked) {
					for (let keys = Object.keys(linked), i = 0; i < keys.length; i++) {
						linkedFields[linked[keys[i]].path] = key;
					}
				}
			}

			{
				const list = [
					oldCtx.meta.systemFields,
					oldCtx.meta.fields
				];

				for (let i = 0; i < list.length; i++) {
					const
						obj = list[i],
						keys = Object.keys(obj);

					for (let j = 0; j < keys.length; j++) {
						const
							key = keys[j],
							field = obj[key],
							link = linkedFields[key];

						const
							val = ctx[key],
							old = oldCtx[key];

						if (
							!ctx.$dataCache[key] &&
							(Object.isFunction(field.unique) ? !field.unique(ctx, oldCtx) : !field.unique) &&
							!Object.fastCompare(val, old) &&

							(
								!link ||
								link && Object.fastCompare(props[link], oldProps[link])
							)
						) {
							if (field.merge) {
								if (field.merge === true) {
									let
										newVal = old;

									if (Object.isObject(val) || Object.isObject(old)) {
										// tslint:disable-next-line:prefer-object-spread
										newVal = Object.assign({}, val, old);

									} else if (Object.isArray(val) || Object.isArray(old)) {
										// tslint:disable-next-line:prefer-object-spread
										newVal = Object.assign([], val, old);
									}

									ctx[key] = newVal;

								} else {
									field.merge(ctx, oldCtx, key, link);
								}

							} else {
								ctx[key] = oldCtx[key];
							}
						}
					}
				}
			}
		}

		if (ctx.$refI) {
			const
				refs = {},
				refNodes = el.querySelectorAll(`.${ctx.componentId}[data-component-ref]`);

			for (let i = 0; i < refNodes.length; i++) {
				const
					el = refNodes[i],
					ref = el.dataset.componentRef;

				refs[ref] = refs[ref] ? [].concat(refs[ref], el) : el;
			}

			for (let keys = Object.keys(refs), i = 0; i < keys.length; i++) {
				const
					key = keys[i],
					el = refs[key];

				let
					cache;

				Object.defineProperty(ctx.$refs, key, {
					enumerable: true,
					configurable: true,

					get(): any {
						if (cache) {
							return cache;
						}

						if (Object.isArray(el)) {
							const
								res = <any[]>[];

							for (let i = 0; i < el.length; i++) {
								const v = <any>el[i];
								res.push(v.component || v);
							}

							return cache = res;
						}

						return cache = el.component || el;
					}
				});
			}
		}

		ctx.hook = 'mounted';
		el.component = ctx;

		runHook('mounted', meta, ctx).then(() => {
			if (methods.mounted) {
				return methods.mounted.fn.call(ctx);
			}
		}, stderr);
	};

	mount[$$.self] = ctx;

	const
		parentHook = parentMountMap[p.hook];

	for (let i = 0; i < mountHooks.length; i++) {
		const
			hook = mountHooks[i];

		if (hook === parentHook) {
			continue;
		}

		hooks[hook].unshift({
			fn: mount
		});
	}

	if (parentHook) {
		hooks[parentHook].unshift({
			fn: mount
		});

	} else {
		mount().catch(stderr);
	}

	return vnode;
}

/**
 * Executes a render object with the specified fake component context
 *
 * @param renderObject
 * @param fakeCtx
 */
export function execRenderObject(renderObject: RenderObject, fakeCtx: Dictionary<any>): VNode {
	const
		fns = renderObject.staticRenderFns;

	if (fns) {
		if (!Object.isArray(fakeCtx._staticTrees)) {
			fakeCtx._staticTrees = [];
		}

		for (let i = 0; i < fns.length; i++) {
			fakeCtx._staticTrees.push(fns[i].call(fakeCtx));
		}
	}

	return renderObject.render.call(fakeCtx);
}

/**
 * Takes an object with compiled templates and returns a new render function
 *
 * @param renderObject
 * @param baseCtx - base component context
 */
export function convertRender(
	renderObject: RenderObject,
	baseCtx: FunctionalCtx
): FunctionalComponentOptions['render'] {
	if (cache.has(renderObject)) {
		return cache.get(renderObject);
	}

	const render = (el, ctx) => {
		const fakeCtx = render[CTX] = createFakeCtx(el, ctx, baseCtx);
		return patchVNode(execRenderObject(renderObject, fakeCtx), fakeCtx, ctx);
	};

	cache.set(renderObject, render);
	return render;
}