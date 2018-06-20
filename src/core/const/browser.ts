/*!
 * V4Fire Client Core
 * https://github.com/V4Fire/Client
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Client/blob/master/LICENSE
 */

const
	agent = navigator.userAgent;

export type Operations =
	'>' |
	'>=' |
	'<' |
	'<=' |
	'==' |
	'^=';

/**
 * Returns a tuple (browserName, browserVersion?[]) or false from the specified pattern
 * @param pattern
 */
export function match(pattern: RegExp | string): [string, number[] | null] | boolean {
	const
		rgxp = Object.isString(pattern) ? new RegExp(`(${pattern})(?:[ \\/-]([0-9.]*))?`, 'i') : pattern,
		res = agent.match(rgxp);

	return res ? [res[1], res[2] ? res[2].split('.').map(parseInt) : null] : false;
}

export const is = {
	Firefox: match('Firefox'),
	Android: match('Android'),
	BlackBerry: match('BlackBerry'),
	iOS: match('(?:iPhone|iPad|iPod)'),
	OperaMini: match('Opera Mini'),
	WindowsMobile: match('IEMobile'),

	/**
	 * Returns true if navigator.userAgent matches the specified parameters
	 *
	 * @param platform - browser platform
	 * @param [operation] - operation type (>, >=, etc.)
	 * @param [version] - browser version
	 */
	test(platform: string, operation?: Operations, version?: string): boolean {
		const
			val = this[platform];

		if (!val) {
			return false;
		}

		if (!operation || !version) {
			return true;
		}

		if (!val[1]) {
			return false;
		}

		const
			v1 = val[1],
			v2 = version.split('.').map(parseInt);

		const
			gt = v1[0] > v2[0] || v1[1] > v2[1] || v1[2] > v2[2],
			lt = v1[0] < v2[0] || v1[1] < v2[1] || v1[2] < v2[2],
			eq = v1.join() === v2.join();

		switch (operation) {
			case '>':
				return gt;

			case '>=':
				return gt || eq;

			case '<':
				return lt;

			case '<=':
				return lt || eq;

			case '==':
				return eq;

			case '^=':
				return v1[0] === v2[0];
		}
	},

	/**
	 * Version of the current mobile browser or false
	 */
	get mobile(): string[] | boolean {
		return this.android || this.blackberry || this.ios || this.operamini || this.windowsmobile || false;
	}
};
