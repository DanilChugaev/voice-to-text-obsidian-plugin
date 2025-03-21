import process from 'process';

const isProd = (process.argv[2] === "production");

export function logger(message: string, optional?: string): void {
	const text = `${message}: ${optional ? optional + ' - ' : ''}${new Date().toISOString()}`;

	if (!isProd) {
		console.log(text);
	}


	// todo в файл логов записывать инфу
	// todo в режиме разработки писать в консоль и в логи
	// todo в режиме прода писать только в логи
}
