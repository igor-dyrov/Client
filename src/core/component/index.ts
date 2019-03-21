/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

// @ts-ignore
import * as defTpls from 'core/block.ss';
import log from 'core/log';

import 'core/component/filters';
import 'core/component/directives';

import inheritMeta from 'core/component/create/inherit';
import { ComponentInterface, ComponentParams, ComponentMeta, ComponentMethod } from 'core/component/interface';
import {

	supports,
	minimalCtx,
	renderData,

	ComponentDriver,
	RenderContext,
	CreateElement,
	VNode,
	VNodeData

} from 'core/component/engines';

import { isAbstractComponent, getComponent, getBaseComponent } from 'core/component/create';
import { createFakeCtx, execRenderObject, patchVNode } from 'core/component/create/functional';
import { getComponentDataFromVnode, createCompositeElement } from 'core/component/create/composite';
import { components, localComponents, rootComponents, initEvent } from 'core/component/const';

export * from 'core/component/interface';
export * from 'core/component/const';
export * from 'core/component/create/functional';
export * from 'core/component/create/composite';

export { PARENT } from 'core/component/create/inherit';
export { customWatcherRgxp, runHook } from 'core/component/create/helpers';
export { default as globalEvent, reset, ResetType } from 'core/component/event';
export { prop, field, system, p, hook, watch, paramsFactory } from 'core/component/decorators';
export {

	renderData,
	ComponentDriver as default,
	WatchOptions,

	VNode,
	VNodeDirective,
	CreateElement

} from 'core/component/engines';

export const
	isSmartComponent = /-functional$/;

/**
 * Returns a component name
 * @param constr
 */
export function getComponentName(constr: Function): string {
	return constr.name.dasherize();
}

const
	minimalCtxCache = Object.create(null),
	tplCache = Object.create(null);

/**
 * Creates a new component
 *
 * @decorator
 * @param [params] - additional parameters:
 *   *) [name] - component name
 *   *) [root] - if true, then the component will be registered as root
 *   *) [tpl] - if false, then will be used the default template
 *   *) [functional] - functional status:
 *        *) if true, then the component will be created as functional
 *        *) if a table with parameters, then the component will be created as smart component
 *
 *   *) [flyweight] - if true, then the component can be used as flyweight (within a composite virtual tree)
 *   *) [parent] - link to a parent component
 *
 *   // Component driver options (by default Vue):
 *
 *   *) [model] - parameters for a model option
 *   *) [provide] - parameters for a provide option
 *   *) [inject] - parameters for an inject option
 *   *) [inheritAttrs] - parameters for an inheritAttrs option
 */
export function component(params?: ComponentParams): Function {
	return (target) => {
		const
			name = params && params.name || getComponentName(target),
			parent = Object.getPrototypeOf(target),
			parentMeta = components.get(parent);

		let p: ComponentParams = parentMeta ? {...params} : {
			root: false,
			tpl: true,
			inheritAttrs: true,
			...params
		};

		const
			mods = {};

		if (target.mods) {
			for (let o = target.mods, keys = Object.keys(o), i = 0; i < keys.length; i++) {
				const key = keys[i];
				mods[key.camelize(false)] = o[key];
			}
		}

		const meta: ComponentMeta = {
			name,
			componentName: name.replace(isSmartComponent, ''),

			parentMeta,
			constructor: target,
			instance: {},
			params: p,

			props: {},
			fields: {},
			systemFields: {},
			mods,

			computed: {},
			accessors: {},
			methods: {},
			watchers: {},

			hooks: {
				beforeRuntime: [],
				beforeCreate: [],
				beforeDataCreate: [],
				created: [],
				beforeMount: [],
				beforeMounted: [],
				mounted: [],
				beforeUpdate: [],
				beforeUpdated: [],
				updated: [],
				beforeActivated: [],
				activated: [],
				deactivated: [],
				beforeDestroy: [],
				destroyed: [],
				errorCaptured: []
			},

			component: {
				name,
				mods: {},
				props: {},
				methods: {},
				computed: {},
				staticRenderFns: [],
				render(this: ComponentInterface, nativeCreate: CreateElement, baseCtx: RenderContext): VNode {
					const
						{methods: {render: r}} = meta;

					if (r) {
						const
							// tslint:disable-next-line:no-this-assignment
							rootCtx = this,

							// @ts-ignore
							asyncLabel = rootCtx.$asyncLabel;

						let
							tasks = <Function[]>[];

						const createElement = function (tag: string, opts?: VNodeData, children?: VNode[]): VNode {
							'use strict';

							const
								ctx = this || rootCtx;

							const
								attrOpts = Object.isObject(opts) && opts.attrs || {},
								tagName = attrOpts['v4-composite'] || tag,
								renderKey = attrOpts['render-key'] != null ?
									`${tagName}:${attrOpts['global-name']}:${attrOpts['render-key']}` : '';

							let
								vnode = ctx.renderTmp[renderKey],
								needEl = Boolean(attrOpts['v4-composite']);

							if (!vnode) {
								const
									component = components.get(tag);

								if (supports.functional && component && component.params.functional === true) {
									needEl = true;

									const
										nm = component.componentName,
										tpl = TPLS[nm];

									if (!tpl) {
										return nativeCreate('span');
									}

									const
										node = nativeCreate('span', {...opts, tag: undefined}, children),
										data = getComponentDataFromVnode(nm, node);

									const renderCtx: RenderContext = {
										parent: ctx,
										children: node.children || [],
										props: data.props,

										// @ts-ignore
										listeners: data.on,

										slots: () => data.slots,
										// @ts-ignore
										scopedSlots: data.scopedSlots,

										data: {
											ref: data.ref,
											refInFor: data.refInFor,
											// @ts-ignore
											on: data.on,
											attrs: data.attrs,
											class: data.class,
											staticClass: data.staticClass,
											// @ts-ignore
											style: data.style
										}
									};

									const fakeCtx = createFakeCtx(
										// @ts-ignore
										createElement,
										renderCtx,

										minimalCtxCache[nm] = minimalCtxCache[nm] || Object.assign(Object.create(minimalCtx), {
											meta: component,
											instance: component.instance,
											componentName: component.componentName,
											$options: {}
										}),

										{initProps: true}
									);

									// @ts-ignore
									const renderObject = tplCache[nm] = tplCache[nm] || tpl.index();
									vnode = patchVNode(execRenderObject(renderObject, fakeCtx), fakeCtx, renderCtx);
								}
							}

							if (!vnode) {
								vnode = createCompositeElement(
									nativeCreate.apply(ctx, arguments),
									ctx
								);
							}

							const
								vData = vnode.data || {},
								ref = vData.ref;

							if (renderKey) {
								ctx.renderTmp[renderKey] = vnode;
							}

							if (ref && ctx !== rootCtx) {
								const
									newRef = vData.ref = `${ref}:${ctx.componentId}`;

								Object.defineProperty(ctx.$refs, ref, {
									configurable: true,
									enumerable: true,
									// @ts-ignore
									get: () => rootCtx.$refs[newRef]
								});
							}

							if (needEl && vnode.fakeContext) {
								Object.defineProperty(vnode.fakeContext, '$el', {
									enumerable: true,
									configurable: true,

									set(): void {
										return undefined;
									},

									get(): CanUndef<Node> {
										return vnode.elm;
									}
								});
							}

							if (tasks.length) {
								for (let i = 0; i < tasks.length; i++) {
									tasks[i](vnode);
								}

								tasks = [];
							}

							return vnode;
						};

						if (rootCtx) {
							// @ts-ignore
							rootCtx.$createElement = rootCtx._c = createElement;

							// @ts-ignore
							const forEach = rootCtx._l;

							// @ts-ignore
							rootCtx._l = (obj, cb) => {
								const
									res = forEach(obj, cb);

								if (obj[asyncLabel]) {
									tasks.push((vnode) => {
										const
											ctx = vnode.fakeContext = vnode.context,
											hook = {created: true, beforeMount: true}[ctx.hook] ? 'mounted' : 'updated',
											hooks = ctx.meta.hooks[hook];

										const fn = () => {
											const
												filteredHooks = <unknown[]>[];

											for (let i = hooks.length; i--;) {
												const
													el = hooks[i];

												if (el && el.fn !== fn) {
													filteredHooks.push(el);
												}
											}

											ctx.meta.hooks[hook] = filteredHooks;

											obj[asyncLabel]((obj) => {
												const
													els = <Node[]>[];

												for (let o = renderData(<VNode[]>forEach(obj, cb), vnode.context), i = 0; i < o.length; i++) {
													els.push(vnode.elm.appendChild(o[i]));
												}

												return els;
											});
										};

										hooks.push({fn});
									});
								}

								return res;
							};
						}

						return r.fn.call(rootCtx, createElement, baseCtx);
					}

					return nativeCreate('span');
				}
			}
		};

		if (parentMeta) {
			p = inheritMeta(meta, parentMeta);
		}

		if (!p.name || !isSmartComponent.test(p.name)) {
			components.set(target, meta);
		}

		components.set(name, meta);
		initEvent.emit('constructor', {meta, parentMeta});

		if (isAbstractComponent.test(name)) {
			getBaseComponent(target, meta);
			return;
		}

		const loadTemplate = (component) => (resolve) => {
			const success = () => {
				if (localComponents.has(target)) {
					// tslint:disable-next-line:prefer-object-spread
					component.components = Object.assign(component.components || {}, localComponents.get(target));
				}

				log(`component:load:${name}`, component);
				resolve(component);
			};

			const
				{methods, methods: {render: r}} = meta;

			const addRenderAndResolve = (tpls) => {
				const
					fns = tplCache[name] = tplCache[name] || tpls.index(),
					renderObj = <ComponentMethod>{wrapper: true, watchers: {}, hooks: {}};

				renderObj.fn = fns.render;
				component.staticRenderFns = meta.component.staticRenderFns = fns.staticRenderFns || [];

				methods.render = renderObj;
				success();
			};

			if (p.tpl === false) {
				if (r && !r.wrapper) {
					success();

				} else {
					addRenderAndResolve(defTpls.block);
				}

			} else {
				let
					i = 0;

				const f = () => {
					const
						fns = TPLS[meta.componentName];

					if (fns) {
						if (r && !r.wrapper) {
							success();

						} else {
							addRenderAndResolve(fns);
						}

					} else {
						if (i < 15) {
							i++;
							setImmediate(f);

						} else {
							setTimeout(f, 100);
						}
					}
				};

				f();
			}
		};

		const
			obj = loadTemplate(getComponent(target, meta));

		if (p.root) {
			rootComponents[name] = new Promise(obj);

		} else {
			ComponentDriver.component(name, obj);
		}

		if (!Object.isBoolean(p.functional)) {
			component({
				...params,
				name: `${name}-functional`,
				functional: true
			})(target);
		}
	};
}
