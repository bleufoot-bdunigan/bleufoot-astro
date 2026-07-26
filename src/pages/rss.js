import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context) {
    const posts = await getCollection('blog', ({ data }) => {
        return data.draft !== true;
    });

    return rss({
        title: 'Bleufoot Solutions Technology Insights',
        description:
        'Technology strategy, managed services, cybersecurity, cloud, and networking insights.',
        site: context.site,
        trailingSlash: false,

        items: posts
        .sort(
            (a, b) =>
            b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
        )
        .map((post) => ({
            title: post.data.title,
            description: post.data.description,
            pubDate: post.data.pubDate,
            link: `/blog/${post.id}`,
        })),
    });
}
