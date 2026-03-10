import performanceRaw from '../data/performance.json';
import yearlyRaw from '../data/performance_yearly.json';
import sourceDataRaw from '../data/source_data.json';
import selectorDataRaw from '../data/selector.json';
import sheet2Raw from '../data/sheet2_data.json';
import sheet5Raw from '../data/sheet5_data.json';

const registry: Record<string, any> = {
    '/data/performance.json': performanceRaw,
    '/data/performance_yearly.json': yearlyRaw,
    '/data/source_data.json': sourceDataRaw,
    '/data/selector.json': selectorDataRaw,
    '/data/sheet2_data.json': sheet2Raw,
    '/data/sheet5_data.json': sheet5Raw,
};

export const fetchData = async (url: string, _options?: any) => {
    // Check if the URL matches our bundle registry
    const bundledData = registry[url];
    if (bundledData) {
        return {
            ok: true,
            status: 200,
            json: async () => bundledData
        };
    }
    // Fallback to real fetch for anything else
    return fetch(url, _options);
};
