/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import iBlock from 'super/i-block/i-block';
import { ExperimentsSet } from 'core/abt/interface';
import { ModVal } from 'core/component';

export type ModsTable = Dictionary<ModVal>;
export type ModsNTable = Dictionary<CanUndef<string>>;

/**
 * Merges old component modifiers with new
 * (for functional components)
 *
 * @param component
 * @param oldComponent
 * @param key - field key
 * @param link - link key
 */
export function mergeMods(
	component: iBlock,
	oldComponent: iBlock,
	key: string,
	link?: string
): void {
	if (!link) {
		return;
	}

	const
		// @ts-ignore
		cache = component.syncLinkCache[link];

	if (!cache) {
		return;
	}

	const
		l = cache[key];

	if (!l) {
		return;
	}

	const getFullModsProp = (o) => {
		const
			declMods = o.meta.component.mods,
			res = {...o.$props[link]};

		for (let attrs = o.$attrs, keys = Object.keys(attrs), i = 0; i < keys.length; i++) {
			const
				key = keys[i];

			if (key in declMods) {
				const
					attrVal = attrs[key];

				if (attrVal != null) {
					res[key] = attrVal;
				}
			}
		}

		return res;
	};

	const
		modsProp = getFullModsProp(component),
		mods = {...oldComponent.mods};

	for (let keys = Object.keys(mods), i = 0; i < keys.length; i++) {
		const
			key = keys[i];

		// @ts-ignore
		if (component.syncModCache[key]) {
			delete mods[key];
		}
	}

	if (Object.fastCompare(modsProp, getFullModsProp(oldComponent))) {
		l.sync(mods);

	} else {
		// tslint:disable-next-line:prefer-object-spread
		l.sync(Object.assign(mods, modsProp));
	}
}

/**
 * Initializes the component modifiers
 * @param component
 */
export function initMods(component: iBlock): ModsNTable {
	const
		// @ts-ignore
		declMods = component.meta.component.mods,
		attrMods = <string[][]>[],
		modVal = (val) => val != null ? String(val) : val;

	// @ts-ignore
	for (let attrs = component.$attrs, keys = Object.keys(attrs), i = 0; i < keys.length; i++) {
		const
			key = keys[i];

		if (key in declMods) {
			const attrVal = attrs[key];
			component.watch(`$attrs.${key}`, (val) => component.setMod(key, modVal(val)));

			if (attrVal == null) {
				continue;
			}

			attrMods.push([key, attrVal]);
		}
	}

	function link(val: ModsTable): ModsNTable {
		const
			// tslint:disable-next-line:prefer-object-spread
			mods = Object.assign(component.mods || {...declMods}, val);

		const
			{experiments} = component.$root.remoteState;

		for (let i = 0; i < attrMods.length; i++) {
			const [key, val] = attrMods[i];
			mods[key] = val;
		}

		if (Object.isArray(experiments)) {
			for (let i = 0; i < experiments.length; i++) {
				const
					el = (<ExperimentsSet>experiments)[i];

				if (el.meta && el.meta.mods) {
					Object.assign(mods, el.meta.mods);
				}
			}
		}

		for (let keys = Object.keys(mods), i = 0; i < keys.length; i++) {
			const
				key = keys[i],
				val = modVal(mods[key]);

			mods[key] = val;
			component.hook !== 'beforeDataCreate' && component.setMod(key, val);
		}

		return mods;
	}

	return component.link<any>(link);
}

export function getWatchableMods(component: iBlock): Readonly<ModsNTable> {
	const
		o = {},
		w = <NonNullable<ModsNTable>>component.field.get('watchModsStore'),
		m = component.mods;

	for (let keys = Object.keys(m), i = 0; i < keys.length; i++) {
		const
			key = keys[i],
			val = m[key];

		if (key in w) {
			o[key] = val;

		} else {
			Object.defineProperty(o, key, {
				get: () => {
					if (!(key in w)) {
						w[key] = val;
					}

					return val;
				}
			});
		}
	}

	return Object.freeze(o);
}
