/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

import KeyCodes from 'core/keyCodes';
import iData, { field, component, prop, watch, hook, ModsDecl } from 'super/i-data/i-data';
import { RequestError } from 'core/data';
export * from 'super/i-data/i-data';

@component()
export default class bWindow<T extends Dictionary = Dictionary> extends iData<T> {
	/**
	 * Initial window title
	 */
	@prop({type: String, required: false})
	readonly titleProp?: string;

	/**
	 * Map of window titles ({stage: title})
	 */
	@prop(Object)
	readonly stageTitles: Dictionary<string> = {};

	/**
	 * Name of an active third-party slot
	 */
	@prop({type: String, required: false})
	readonly slotNameProp?: string;

	/** @inheritDoc */
	static readonly mods: ModsDecl = {
		hidden: [
			['true'],
			'false'
		]
	};

	/**
	 * Window title store
	 */
	@field((o) => o.link())
	protected titleStore?: string;

	/**
	 * Slot name store
	 */
	@field((o) => o.link())
	protected slotNameStore?: string;

	/** @override */
	set error(value: string) {
		if (value) {
			this.stage = 'error';
		}

		this.errorMsg = value;
	}

	/**
	 * @override
	 * @param [stage] - window stage
	 */
	async open(stage?: string): Promise<boolean> {
		if (await this.setMod('hidden', false)) {
			if (stage) {
				this.stage = stage;
			}

			this.setRootMod('hidden', false);
			await this.nextTick();
			this.emit('open');
			return true;
		}

		return false;
	}

	/** @override */
	async close(): Promise<boolean> {
		if (await this.setMod('hidden', true)) {
			this.setRootMod('hidden', true);
			this.emit('close');
			return true;
		}

		return false;
	}

	/**
	 * Slot name
	 */
	get slotName(): any {
		return this.slotNameStore;
	}

	/**
	 * Sets slot name
	 * @param val
	 */
	set slotName(val: any) {
		this.slotNameStore = val;
	}

	/**
	 * Window title
	 */
	get title(): string {
		return this.titleStore && this.stage ? this.t(this.stageTitles[this.stage]) : '';
	}

	/**
	 * Sets the specified window title
	 */
	set title(value: string) {
		this.titleStore = value;
	}

	/**
	 * Clears async handlers by group on stage change
	 *
	 * @param value
	 * @param oldValue
	 */
	@watch('stage')
	protected clearOnStageChange(value: string, oldValue: string): void {
		this.async.clearAll({group: `stage.${oldValue}`});
	}

	/**
	 * Handler: error
	 * @param err
	 */
	protected onError(err: RequestError): void {
		this.error = this.getDefaultErrorText(err);
	}

	/** @override */
	@hook('created')
	protected initCloseHelpers(): void {
		const
			{async: $a, localEvent: $e} = this,
			group = 'closeHelpers';

		const closeHelpers = () => {
			$a.on(document, 'keyup', async (e) => {
				if (e.keyCode === KeyCodes.ESC) {
					await this.close();
				}
			}, {group});

			$a.on(document, 'mousedown touchstart', async (e) => {
				if (e.target.matches(this.block.getElSelector('wrapper'))) {
					await this.close();

					$a.once(document, 'click mouseup touchend', (e) => {
						e.stopImmediatePropagation();
					}, {group}, {capture: true});
				}
			}, {group});
		};

		$e.removeAllListeners('block.mod.*.hidden.*');
		$e.on('block.mod.remove.hidden.*', closeHelpers);
		$e.on('block.mod.set.hidden.false', closeHelpers);
		$e.on('block.mod.set.hidden.true', () => $a.off({group}));
	}

	/** @override */
	protected mounted(): void {
		super.mounted();
		document.body.insertAdjacentElement('beforeend', this.$el);
	}

	/** @override */
	protected beforeDestroy(): void {
		super.beforeDestroy();
		this.removeRootMod('hidden');
		this.$el.remove();
	}
}
