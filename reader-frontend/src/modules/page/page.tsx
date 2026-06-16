import { useParams } from 'react-router-dom';
import { PageView } from './view';

export default function PagePage() {
    const { id } = useParams<{ id: string }>();
    if (!id) return null;
    return <PageView pageId={id} />;
}
