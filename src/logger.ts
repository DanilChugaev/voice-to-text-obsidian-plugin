import process from 'process';

const isProd = (process.argv[2] === "production");

export function logger(message: string, optionalParams?: any): void {
	const text = `${message}: ${optionalParams ? optionalParams + ' - ' : ''}${new Date().toISOString()}`;

	if (!isProd) {
		console.log(text);
	}


	// todo в файл логов записывать инфу
	// todo в режиме разработки писать в консоль и в логи
	// todo в режиме прода писать только в логи
}
