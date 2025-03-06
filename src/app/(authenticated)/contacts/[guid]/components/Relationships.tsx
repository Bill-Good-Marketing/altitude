'use client';
import {Card, CardContent, CardHeader, CardTitle} from "~/components/ui/card";
import {Button} from "~/components/ui/button";
import {ArrowRight, Building, CircleHelp, Edit, House, Plus, Trash2, UserCircle} from "lucide-react";
import React, {useEffect} from "react";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "~/components/ui/tabs";
import {
    createRelationship,
    deleteRelationship,
    getRelationships,
    updateRelationship
} from "~/app/(authenticated)/contacts/[guid]/components/Actions";
import {handleServerAction} from "~/util/api/client/APIClient";
import {
    companyRelationships,
    ContactRelationshipType,
    ContactRelationshipTypeNameMapping,
    ContactType,
    ContactTypeNameMapping,
    familialRelationships,
    getContactTypeFromRelationshipType,
    householdRelationships,
    professionalRelationships
} from "~/common/enum/enumerations";
import {useTabContext} from "~/app/(authenticated)/contacts/[guid]/TabContext";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "~/components/ui/dialog";
import {Label} from "~/components/ui/label";
import {Input} from "~/components/ui/input";
import {Textarea} from "~/components/ui/textarea";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "~/components/ui/select";
import {Multiselect} from "~/components/ui/multiselect";
import {DataTable} from "~/components/data/DataTable";
import {Picker} from "~/components/data/Picker";
import {readContact} from "~/common/actions/read";
import {toast} from "sonner";
import {Avatar, AvatarFallback} from "~/components/ui/avatar";
import {Switch} from "~/components/ui/switch";
import {properArticle} from "~/util/strings";
import {useConfirmation} from "~/hooks/use-confirmation";
import {ClientSideReadResult} from "~/db/sql/types/utility";
import {useStateRef} from "~/hooks/use-state-ref";
import {ForceGraph2D} from "~/components/ui/force-graph";

type Node = {
    name: string,
    key: string,
    type: ContactType,
}

type Relationship = {
    relationId: string,
    type: ContactRelationshipType,
    target: string
    source: string
    established?: Date
    notes?: string
}

const wrapText = function (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): [string, number, number][] {
    'use no memo';
    // First, start by splitting all of our text into words, but splitting it into an array split by spaces
    const words = text.split(' ');
    let line = ''; // This will store the text of the current line
    let testLine = ''; // This will store the text when we add a word, to test if it's too long
    const lineArray: [string, number, number][] = []; // This is an array of lines, which the function will return

    // Let's iterate over each word
    for (let n = 0; n < words.length; n++) {
        // Create a test line, and measure it..
        testLine += `${words[n]} `;
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        // If the width of this test line is more than the max width
        if (testWidth > maxWidth && n > 0) {
            // Then the line is finished, push the current line into "lineArray"
            lineArray.push([line, x, y]);
            // Increase the line height, so a new line is started
            y += lineHeight;
            // Update line and test line to use this word as the first word on the next line
            line = `${words[n]} `;
            testLine = `${words[n]} `;
        } else {
            // If the test line is still less than the max width, then add the word to the current line
            line += `${words[n]} `;
        }
        // If we never reach the full max width, then there is only one line.. so push it into the lineArray so we return something
        if (n === words.length - 1) {
            lineArray.push([line, x, y]);
        }
    }
    // Return the line array
    return lineArray;
}

function dateToPicker(date: Date) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

export function Relationships({id, name, type}: { id: string, name: string, type: ContactType }) {
    const {currentTab} = useTabContext()
    const [loadedNodes, setLoadedNodes] = React.useState<Node[]>([{
        name: name,
        key: id,
        type,
    }]);

    const [loadedLinks, setLoadedLinks] = React.useState<Relationship[]>([]);

    const [isLoaded, setIsLoaded] = React.useState<string[]>([]); // IDs of nodes that have been loaded

    const loadedNodesRef = useStateRef(loadedNodes);
    const loadedLinksRef = useStateRef(loadedLinks);

    // False if not loading, string for id of loading node
    const [isLoading, setIsLoading] = React.useState<false | string>(false);
    const [initialized, setInitialized] = React.useState(false);

    type SelectedRelationship = {
        relationId: string,
        id: string,
        name: string,
        type: ContactRelationshipType | null,
        targetName: string,
        targetId: string,
        established?: string,
        notes: string
        linkIdx: number,
        contact: ClientSideReadResult<typeof readContact<['fullName', 'type', 'primaryEmail']>> | null
    }

    const [selectedRelationship, setSelectedRelationship] = React.useState<SelectedRelationship | null>(null);

    type RelationshipType = 'professional' | 'familial' | 'household' | 'company' | 'referrals'
    const [selectedTypes, setSelectedTypes] = React.useState<RelationshipType[] | 'all'>('all');
    const [relationSearchTerm, setRelationSearchTerm] = React.useState('');
    const [interimRelationSearchTerm, setInterimRelationSearchTerm] = React.useState('');

    const [isAddingRelationship, setIsAddingRelationship] = React.useState(false);
    const [flipDirection, setFlipDirection] = React.useState(false);

    const {confirm, confirmation} = useConfirmation();

    const handleRelationSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
        const term = event.target.value
        setInterimRelationSearchTerm(term)
    }

    const confirmRelationSearch = () => {
        setRelationSearchTerm(interimRelationSearchTerm)
    }

    const processNewRelationships = (id: string, relationships: Awaited<ReturnType<typeof getRelationships>>) => {
        const relations = handleServerAction(relationships);
        if (relations.success && relations.result) {
            const nodes: Node[] = [...loadedNodesRef.current];
            const newNodes: Node[] = [];
            const idSet = new Set(nodes.map(node => node.key));

            const links: Relationship[] = loadedLinksRef.current ?? []
            const newLinks: Relationship[] = [];

            const linkset = new Set(links.map(link => link.target + link.source + link.type));
            for (const node of relations.result) {
                if (!idSet.has(node.id)) {
                    newNodes.push({
                        name: node.name,
                        key: node.id,
                        type: node.nodeType
                    });
                    idSet.add(node.id);
                }
                for (const relation of node.relationships) {
                    if (!linkset.has(relation.target + relation.source + relation.type)) {
                        newLinks.push({
                            relationId: relation.id,
                            type: relation.type,
                            target: relation.target,
                            source: relation.source,
                            established: relation.established ? new Date(relation.established) : undefined,
                            notes: relation.notes ?? ''
                        });
                        linkset.add(relation.target + relation.source + relation.type);
                    }
                }
            }
            setLoadedNodes((prev) => [...prev, ...newNodes]);
            setLoadedLinks((prev) => [...prev, ...newLinks]);
            setIsLoaded((prev) => [...prev, id]);
        }
        setIsLoading(false);
    }

    useEffect(() => {
        const element = document.getElementById(`relationships-${id}`);

        async function handleClickNavigation() {
            if (!initialized && currentTab === 'relationships') {
                setInitialized(true);
                setIsLoading(id);
                processNewRelationships(id, await getRelationships(id));
            }
        }

        async function handleClickTab() {
            if (!initialized) {
                setInitialized(true);
                setIsLoading(id);
                processNewRelationships(id, await getRelationships(id));
            }
        }

        if (element) {
            element.addEventListener('click', handleClickTab);
        }

        const navElement = document.getElementById(`nav-${id}`);
        if (navElement) {
            navElement.addEventListener('click', handleClickNavigation);
        }

        return () => {
            if (element) {
                element.removeEventListener('click', handleClickTab);
            }

            if (navElement) {
                navElement.removeEventListener('click', handleClickNavigation);
            }
        }
    }, [currentTab, id, initialized, processNewRelationships]);

    const _calcLoadedNodes = () => {
        const nodeMap: {
            [key: string]: {
                name: string,
                id: string,
                links: Relationship[] // Ids of the links that originate from this node
            }
        } = {};
        for (const node of loadedNodes) {
            nodeMap[node.key] = {
                name: node.name,
                id: node.key,
                links: []
            }
        }

        for (const link of loadedLinks) {
            if (link.source in nodeMap && link.target in nodeMap) {
                nodeMap[link.source].links.push(link);
                nodeMap[link.target].links.push(link);
            }
        }
        return nodeMap;
    }

    const nodeMap: {
        [key: string]: {
            name: string,
            id: string,
            links: Relationship[] // Ids of the links that originate from this node
        }
    } = _calcLoadedNodes();

    // Should an apostrophe s be added to the origin's name
    // For professional, familial, and `HOUSEHOLD` relationships
    const isPossessiveRelationship = (type: ContactRelationshipType) => {
        return professionalRelationships.includes(type) || familialRelationships.includes(type) || type === ContactRelationshipType.HOUSEHOLD;
    }

    const linkPredicate = (link: Relationship) => {
        if (selectedTypes === 'all' || selectedTypes.length === 0) {
            return true
        }

        for (const relType of selectedTypes) {
            switch (relType) {
                case 'professional':
                    if (professionalRelationships.includes(link.type)) {
                        return true;
                    }
                    break;
                case 'familial':
                    if (familialRelationships.includes(link.type)) {
                        return true;
                    }
                    break;
                case 'household':
                    if (householdRelationships.includes(link.type)) {
                        return true;
                    }
                    break;
                case 'company':
                    if (companyRelationships.includes(link.type)) {
                        return true;
                    }
                    break;
                case 'referrals':
                    if (link.type === ContactRelationshipType.REFERRED) {
                        return true;
                    }
                    break;
            }
        }
        return false;
    }

    const _calcConnectedNodes = () => {
        const traversedNodes = new Set<string>();
        const connectedNodes = new Set<string>();
        connectedNodes.add(id);
        traversedNodes.add(id);

        function traverse(_links: Relationship[], previous?: string, stack: string[] = []) {
            const links = _links.filter(linkPredicate)
            for (const link of links) {
                let iterationStack = [...stack];
                if (link.source === previous && !traversedNodes.has(link.target)) {
                    // Traverse the target
                    const target = nodeMap[link.target];
                    if (target.name.toLowerCase().includes(relationSearchTerm.toLowerCase())) {
                        connectedNodes.add(target.id);
                        for (const id of iterationStack) {
                            connectedNodes.add(id);
                        }
                        iterationStack = [];
                    }
                    traversedNodes.add(link.target);
                    traverse(target.links, target.id, [...iterationStack, target.id]);
                } else if (link.target === previous && !traversedNodes.has(link.source)) {
                    // Traverse the source
                    const source = nodeMap[link.source];
                    if (source.name.toLowerCase().includes(relationSearchTerm.toLowerCase())) {
                        connectedNodes.add(source.id);
                        for (const id of iterationStack) {
                            connectedNodes.add(id);
                        }
                        iterationStack = [];
                    }
                    traversedNodes.add(link.source);
                    traverse(source.links, source.id, [...iterationStack, source.id]);
                }
            }
        }

        const links = (nodeMap[id].links ?? []).filter(linkPredicate);
        traverse(links, id, []);
        return connectedNodes;
    }
    const _calcNodes = () => {
        const nodes: { name: string, id: string, type: ContactType }[] = [];

        let filtered = loadedNodes.filter(node => {
            const _node = nodeMap[node.key];
            const linksFiltered = _node.links.filter(linkPredicate);
            return linksFiltered.length > 0 || _node.id === id;
        })

        if ((selectedTypes !== 'all' && selectedTypes.length > 0) || relationSearchTerm !== '') {
            filtered = filtered.filter(node => connectedNodes.has(node.key));
        }

        for (const node of filtered) {
            nodes.push({
                name: node.name,
                id: node.key,
                type: node.type
            })
        }

        if (isLoading && connectedNodes.has(isLoading)) {
            for (let i = 0; i < 4; i++) {
                // Add 4 'skeleton' nodes
                nodes.push({
                    name: 'Loading',
                    id: `_skeleton_${i}`,
                    type: ContactType.INDIVIDUAL
                })
            }
        }

        return nodes;
    }

    const connectedNodes = _calcConnectedNodes();
    const nodes = _calcNodes();

    const curvatureMinMax = 0.5;

    type GraphLink = {
        source: string,
        target: string,
        type: string,
        curvature?: number,
        color: string
    }

    const _calcLinks = () => {
        const links: GraphLink[] = [];
        let filtered = loadedLinks.filter(linkPredicate);

        if ((selectedTypes !== 'all' && selectedTypes.length > 0) || relationSearchTerm !== '') {
            filtered = filtered.filter(link => connectedNodes.has(link.target) && connectedNodes.has(link.source));
        }

        const selfLoopLinks: Record<string, GraphLink[]> = {};
        const sameNodeLinks: Record<string, GraphLink[]> = {};

        let linkColor = 'darkgray';
        if (typeof document !== 'undefined' && document.body.classList.contains('dark')) {
            linkColor = 'lightgray';
        }

        for (const link of filtered) {
            const map = link.source === link.target ? selfLoopLinks : sameNodeLinks;
            const key = link.source < link.target ? link.source + link.target : link.target + link.source;
            if (!map[key]) {
                map[key] = [];
            }
            map[key].push({
                source: link.source,
                target: link.target,
                type: link.type,
                color: linkColor
            });
        }

        Object.keys(selfLoopLinks).forEach(key => {
            const _links = selfLoopLinks[key];
            const lastIndex = _links.length - 1;
            _links[lastIndex].curvature = 1;
            const delta = (1 - curvatureMinMax) / lastIndex;
            for (let i = 0; i < lastIndex; i++) {
                _links[i].curvature = curvatureMinMax + delta * i;
            }
            links.push(..._links);
        })

        Object.keys(sameNodeLinks).forEach(key => {
            const _links = sameNodeLinks[key];
            if (_links.length > 1) {
                const lastIndex = _links.length - 1;
                const lastLink = _links[lastIndex];
                lastLink.curvature = curvatureMinMax;
                const delta = 2 * curvatureMinMax / lastIndex;

                for (let i = 0; i < lastIndex; i++) {
                    const _link = _links[i];
                    if (_link == null) {
                        continue;
                    }
                    _link.curvature = -curvatureMinMax + i * delta;
                    if (lastLink.source !== _links[i].source) {
                        _link.curvature *= -1; // flip it around, otherwise they overlap
                    }

                    if (_link.curvature === -0) {
                        _link.curvature = 0;
                    }
                }
            }
            links.push(..._links);
        })

        if (isLoading && connectedNodes.has(isLoading)) {
            for (let i = 0; i < 4; i++) {
                // Add 4 'skeleton' links
                links.push({
                    source: isLoading,
                    target: `_skeleton_${i}`,
                    type: 'Loading',
                    color: linkColor
                })
            }
        }
        return links;
    }

    // Link ids
    const links = _calcLinks();

    type TableRow = {
        relationId: string,
        id: string,
        name: string,
        type: ContactRelationshipType,
        targetName: string,
        targetId: string,
        established?: string,
        notes: string
        linkIdx: number,
    }

    const _calcTableRows = () => {
        const rows: TableRow[] = [];

        const links = (nodeMap[id].links ?? []).filter(linkPredicate).filter(link => {
            if (link.source === id) {
                const target = nodeMap[link.target];
                return target.name.toLowerCase().includes(interimRelationSearchTerm.toLowerCase());
            } else {
                const source = nodeMap[link.source];
                return source.name.toLowerCase().includes(interimRelationSearchTerm.toLowerCase());
            }
        });

        const ids = new Set<string>();

        for (let idx = 0; idx < links.length; idx++) {
            const link = links[idx];
            if ((link.source === id || link.target === id) && !ids.has(link.source + link.target + link.type)) {
                ids.add(link.source + link.target + link.type);
                rows.push({
                    relationId: link.relationId,
                    id: link.source,
                    name: nodeMap[link.source].name,
                    type: link.type as ContactRelationshipType,
                    targetName: nodeMap[link.target].name,
                    targetId: link.target,
                    established: link.established ? dateToPicker(link.established) : undefined,
                    notes: link.notes ?? '',
                    linkIdx: idx,
                })
            }
        }

        return rows;
    }

    // Only depth 1 relationships are shown
    const tableRows = _calcTableRows();

    const individualColor = '#08658F'
    const companyColor = '#333333'
    const householdColor = '#155e75'
    const primaryNodeColor = '#059669'

    const quadraticBezier = (t: number, start: number, control: number, end: number) => {
        const oneMinusT = 1 - t;
        return oneMinusT * oneMinusT * start + 2 * oneMinusT * t * control + t * t * end;
    }

    const cubicBezier = (t: number, start: number, control1: number, control2: number, end: number) => {
        const oneMinusT = 1 - t;
        return Math.pow(oneMinusT, 3) * start + 3 * Math.pow(oneMinusT, 2) * t * control1 + 3 * oneMinusT * Math.pow(t, 2) * control2 + Math.pow(t, 3) * end;
    }

    const forceGraph = <ForceGraph2D
        height={800}
        graphData={{
            nodes: nodes.map(node => ({
                id: node.id,
                name: node.name,
                color: node.type === ContactType.INDIVIDUAL ? individualColor : node.type === ContactType.COMPANY ? companyColor : householdColor
            })),
            links: links.map(link => ({
                source: link.source,
                target: link.target,
                type: link.type,
                curvature: link.curvature,
                color: link.color
            }))
        }}
        nodeCanvasObject={(obj, ctx) => {
            const scale = 10
            const label = obj.name ?? '';
            const fontSize = 12 / scale;
            ctx.font = `bold ${fontSize}px Arial`;
            const maxWidth = 100 / scale;

            const text = wrapText(ctx, label, obj.x ?? 0, obj.y ?? 0, maxWidth, fontSize)

            let maxTextWidth = 0;
            for (const line of text) {
                maxTextWidth = Math.max(maxTextWidth, ctx.measureText(line[0]).width);
            }

            const radius = maxTextWidth / 2 + fontSize * 0.5;

            // Draw a circle with a label
            ctx.beginPath();
            if (!(obj.id as string)!.startsWith('_skeleton_')) {
                if (obj.id === id) {
                    ctx.fillStyle = primaryNodeColor;
                } else ctx.fillStyle = obj.color;
            } else {
                const time = 1500; // ms
                const steps = 30;
                const stepsize = time / steps;

                // Gradient that shifts over time
                const step = Math.round(new Date().getTime() % time / stepsize);
                const gradient = ctx.createRadialGradient(obj.x ?? 0, obj.y ?? 0, 0, obj.x ?? 0, obj.y ?? 0, radius);
                gradient.addColorStop(0, '#FFFFFF');
                gradient.addColorStop(step / steps, '#FFFFFF');
                gradient.addColorStop(step / steps, '#000000');
                gradient.addColorStop(Math.min(step + 1, steps) / steps, '#000000');
                gradient.addColorStop(Math.min(step + 1, steps) / steps, '#FFFFFF');
                gradient.addColorStop(1, '#FFFFFF');
                ctx.fillStyle = gradient;
            }
            ctx.arc(obj.x ?? 0, obj.y ?? 0, radius, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#FFFFFF';

            if (!(obj.id as string)!.startsWith('_skeleton_')) {
                const top = Math.max(...text.map(t => t[2]))
                const bottom = Math.min(...text.map(t => t[2]))
                const offset = (top - bottom) / 2 - fontSize / 4

                text.forEach(([line, x, y]) => {
                    ctx.fillText(line, x, y - offset);
                })
            }
        }}
        linkDirectionalArrowLength={3}
        linkDirectionalArrowRelPos={1}
        linkCurvature={'curvature'}
        linkCanvasObjectMode={() => 'after'}
        linkCanvasObject={(_link, ctx, globalScale) => {
            const link = _link as Required<typeof _link>;
            const MAX_FONT_SIZE = 4;
            const MIN_FONT_SIZE = 2;
            const LABEL_NODE_MARGIN = globalScale * 1.5;

            const start = link.source as Required<typeof _link>;
            const end = link.target as Required<typeof _link>;

            // ignore unbound links
            if (typeof start !== 'object' || typeof end !== 'object' || link.type == null) return;

            // calculate label positioning
            let textPos = {
                x: (start.x + end.x) / 2,
                y: (start.y + end.y) / 2
            }

            if (link.__controlPoints != null) {
                if (link.__controlPoints.length === 2) {
                    // One point, curved
                    textPos = {
                        x: quadraticBezier(0.5, start.x, link.__controlPoints[0], end.x),
                        y: quadraticBezier(0.5, start.y, link.__controlPoints[1], end.y)
                    }
                } else if (link.__controlPoints.length === 4) {
                    // Two points, straight
                    textPos = {
                        x: cubicBezier(0.5, start.x, link.__controlPoints[0], link.__controlPoints[2], end.x),
                        y: cubicBezier(0.5, start.y, link.__controlPoints[1], link.__controlPoints[3], end.y)
                    }
                }
            }

            const relLink = {x: end.x - start.x, y: end.y - start.y};

            const maxTextLength = Math.sqrt(Math.pow(relLink.x, 2) + Math.pow(relLink.y, 2)) - LABEL_NODE_MARGIN * 2;

            let textAngle = Math.atan2(relLink.y, relLink.x);
            // maintain label vertical orientation for legibility
            if (textAngle > Math.PI / 2) textAngle = -(Math.PI - textAngle);
            if (textAngle < -Math.PI / 2) textAngle = -(-Math.PI - textAngle);

            const label = ContactRelationshipTypeNameMapping[link.type as ContactRelationshipType] || link.type;

            // estimate fontSize to fit in link length
            ctx.font = '1px Sans-Serif';
            const fontSize = Math.max(Math.min(MAX_FONT_SIZE, maxTextLength / ctx.measureText(label).width), MIN_FONT_SIZE);
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth + fontSize * 0.2, fontSize + fontSize * 0.2]; // some padding

            // draw text label (with background rect)
            ctx.save();
            ctx.translate(textPos.x, textPos.y);
            ctx.rotate(textAngle);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

            if (document.body.classList.contains('dark')) {
                ctx.fillStyle = 'rgb(10, 10, 10)';
            }

            ctx.fillRect(-bckgDimensions[0] / 2, -bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'darkgrey';

            if (document.body.classList.contains('dark')) {
                ctx.fillStyle = 'white';
            }

            ctx.fillText(label, 0, 0);
            ctx.restore();
        }}
        linkColor={'color'}
        onNodeClick={async (node) => {
            if (!isLoaded.includes(node.id as string)) {
                setIsLoading(node.id as string);
                processNewRelationships(node.id as string, await getRelationships(node.id as string));
            }
        }}
    />

    const validateRelationship = (targetType: ContactType, relationshipType: ContactRelationshipType) => {
        if (targetType !== getContactTypeFromRelationshipType(relationshipType)) {
            return `${properArticle(ContactRelationshipTypeNameMapping[relationshipType] || relationshipType, true, true).replaceAll(/ of$| for$/g, '')} relationship requires ${properArticle(ContactTypeNameMapping[getContactTypeFromRelationshipType(relationshipType)], false, true)} not ${properArticle(ContactTypeNameMapping[targetType], false, true)}.`
        }
        return false;
    }

    let validationMessage: string | false = false;
    if (selectedRelationship && selectedRelationship.type) {
        if (isAddingRelationship && flipDirection) {
            validationMessage = validateRelationship(type, selectedRelationship.type!);
        } else if (selectedRelationship.contact) {
            validationMessage = validateRelationship(selectedRelationship.contact.type, selectedRelationship.type!);
        }
    }

    return <TabsContent value="relationships">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Relationships</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <div className={'flex space-x-4 w-full mb-4'}>
                    <div className={'w-full'}>
                        <Label htmlFor="search">
                            Search
                        </Label>
                        <Input
                            type="search"
                            placeholder="Search relationships..."
                            value={interimRelationSearchTerm}
                            onChange={handleRelationSearch}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    confirmRelationSearch()
                                }
                            }}
                            onBlur={confirmRelationSearch}
                            className="flex-grow"
                        />
                    </div>
                    <div className="w-full">
                        <div className={'w-full'}>
                            <Label htmlFor="types">Relationship Types</Label>
                            <Multiselect
                                placeholder={'Filter by Relationship Type'}
                                id="types"
                                options={[
                                    {
                                        label: 'Professional',
                                        value: 'professional'
                                    }, {
                                        label: 'Familial',
                                        value: 'familial'
                                    }, {
                                        label: 'Household',
                                        value: 'household'
                                    }, {
                                        label: 'Company',
                                        value: 'company'
                                    }, {
                                        label: 'Referrals',
                                        value: 'referrals'
                                    }]} onValueChange={values => {
                                if (values.includes('all')) {
                                    setSelectedTypes('all');
                                    return;
                                }
                                setSelectedTypes(values as RelationshipType[]);
                            }} value={selectedTypes === 'all' ? ['all'] : selectedTypes} maxCount={3}
                                modalPopover={true}
                                className="w-full"/>
                        </div>
                    </div>
                    <Button
                        className={'self-end'}
                        variant={'destructive'}
                        onClick={async () => {
                            setLoadedNodes([{
                                name: name,
                                key: id,
                                type,
                            }]);
                            setLoadedLinks([]);
                            setIsLoaded([]);
                            setSelectedTypes('all');
                            setIsLoading(id);
                            processNewRelationships(id, await getRelationships(id));
                        }}>
                        Reset
                    </Button>
                    <Button
                        variant={'linkHover2'}
                        className={'force-border self-end'}
                        onClick={() => {
                            setIsAddingRelationship(true)
                            setSelectedRelationship({
                                id,
                                relationId: '_new',
                                linkIdx: -1,
                                targetId: '',
                                targetName: '',
                                contact: null,
                                name: '',
                                established: '',
                                notes: '',
                                type: null
                            })
                        }}>
                        <Plus className="mr-2 h-4 w-4"/> Add Relationship
                    </Button>
                </div>
                <Tabs defaultValue={'table'}>
                    <TabsList className="grid grid-cols-2 gap-4 bg-transparent">
                        <TabsTrigger className={'bg-gray-100 dark:bg-zinc-950 data-[state=active]:bg-zinc-200'}
                                     value="table">Table</TabsTrigger>
                        <TabsTrigger className={'bg-gray-100 dark:bg-zinc-950 data-[state=active]:bg-zinc-200'}
                                     value="visual">Visual</TabsTrigger>
                    </TabsList>
                    <TabsContent value="table">
                        <DataTable<TableRow>
                            height={500}
                            data={tableRows}
                            count={tableRows.length} idKey={'relationId'}
                            columns={[{
                                title: 'Name',
                                key: 'name',
                                render: (row: TableRow) => (
                                    <a href={`/contacts/${row.id}`} className="font-medium hover:underline">
                                        {row.name}{isPossessiveRelationship(row.type) ? "'s" : ''}
                                    </a>
                                )
                            }, {
                                title: 'Relationship',
                                key: 'type',
                                render: (row: TableRow) => ContactRelationshipTypeNameMapping[row.type as ContactRelationshipType] || row.type
                            }, {
                                title: 'Relation\'s Name',
                                key: 'targetName',
                                render: (row: TableRow) => (
                                    <a href={`/contacts/${row.targetId}`} className="font-medium hover:underline">
                                        {row.targetName}
                                    </a>
                                )
                            }, {
                                title: 'Established',
                                key: 'established',
                                render: (row: TableRow) => <>{row.established && new Date(row.established).toLocaleDateString()}</>
                            }, {
                                title: 'Actions',
                                key: 'actions',
                                render: (row: TableRow) => <>
                                    <Button
                                        className={'mr-2'}
                                        variant={'outline'}
                                        size="sm" onClick={() => setSelectedRelationship({
                                        ...row, contact: {
                                            guid: row.targetId,
                                            fullName: row.targetName,
                                            primaryEmail: null,
                                            type: getContactTypeFromRelationshipType(row.type),
                                        }
                                    })}>
                                        <Edit className="mr-2 h-4 w-4"/> Edit
                                    </Button>
                                    <Button
                                        onClick={() => (
                                            confirm(`Are you sure you want to delete this relationship between ${row.name} and ${row.targetName}?`, async () => {
                                                let _prev: Relationship | undefined = undefined;
                                                let _prevIdx = -1;

                                                setLoadedLinks((prev) => {
                                                    _prevIdx = prev.findIndex(link => link.target === row.targetId && link.source === row.id && link.type === row.type);
                                                    _prev = prev[_prevIdx];
                                                    return [...prev].filter(link => link.target !== row.targetId || link.source !== row.id || link.type !== row.type);
                                                })

                                                const result = handleServerAction(await deleteRelationship(row.relationId, row.id, row.targetId, row.type));
                                                if (!result.success) {
                                                    setLoadedLinks((prev) => {
                                                        if (_prevIdx > -1 && _prev != null) {
                                                            if (_prevIdx < prev.length) {
                                                                return [...prev.slice(0, _prevIdx), _prev, ...prev.slice(_prevIdx + 1)];
                                                            } else {
                                                                return [...prev, _prev];
                                                            }
                                                        }
                                                        return prev;
                                                    });
                                                }
                                            })
                                        )}
                                        variant={'destructive'}
                                        size={'sm'}>
                                        <Trash2 className="mr-2 h-4 w-4"/> Delete
                                    </Button>
                                </>
                            }]}
                            expandable
                            expandedRender={(row: TableRow) => (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Notes</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p>{row.notes}</p>
                                    </CardContent>
                                </Card>
                            )}/>

                        <Dialog open={selectedRelationship != null} onOpenChange={() => setSelectedRelationship(null)}>
                            <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                    <DialogTitle>{isAddingRelationship ? 'Create' : 'Edit'} Relationship</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="flex flex-col space-y-2">
                                        <Picker
                                            pickerKey={'relatedTo-picker'}
                                            title={'Related To'}
                                            description={'Select the contact you want to relate to'}
                                            searchPlaceholder={'Search contacts...'}
                                            trigger={{
                                                placeholder: 'Search contacts...',
                                                className: 'w-full',
                                                label: 'Related To',
                                                nameKey: 'fullName',
                                            }}
                                            value={selectedRelationship?.contact ?? null}
                                            search={async (search, page, perPage) => {
                                                let contactType: ContactType | undefined = undefined;
                                                if (selectedRelationship?.type) {
                                                    if (!isAddingRelationship || !flipDirection) {
                                                        // Contact type only matters if the user is selecting the relationship's target
                                                        contactType = getContactTypeFromRelationshipType(selectedRelationship.type);
                                                    }
                                                }

                                                const result = handleServerAction(await readContact(search, page, perPage, ['fullName', 'type', 'primaryEmail'], {
                                                    type: contactType
                                                }));
                                                if (result.success) {
                                                    return result.result!
                                                }
                                                throw new Error(`Error reading contacts: ${result.message}`);
                                            }}
                                            dataTypeName={'contact'}
                                            index={1}
                                            modalPopover={true}
                                            onValueChange={(value) => {
                                                setSelectedRelationship(prev => {
                                                    if (prev == null) {
                                                        return prev;
                                                    }
                                                    return {
                                                        ...prev,
                                                        contact: value
                                                    }
                                                })
                                            }}
                                            datatable={{
                                                idKey: 'guid',
                                                columns: [{
                                                    title: 'Icon',
                                                    key: 'icon',
                                                    render: (row) => {
                                                        return <Avatar className="h-10 w-10 mr-4">
                                                            <AvatarFallback>
                                                                {row.type === ContactType.INDIVIDUAL &&
                                                                    <UserCircle className="h-4/5 w-4/5 text-primary"/>}
                                                                {row.type === ContactType.HOUSEHOLD &&
                                                                    <House className="h-4/5 w-4/5 text-primary"/>}
                                                                {row.type === ContactType.COMPANY &&
                                                                    <Building className="h-4/5 w-4/5 text-primary"/>}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    }
                                                },
                                                    {
                                                        title: 'Name',
                                                        key: 'fullName',
                                                    }, {
                                                        title: 'Email',
                                                        key: 'primaryEmail',
                                                    }],
                                            }}
                                            searchKeys={[`type-${selectedRelationship?.type ?? null}`, `flipped-${flipDirection}`]}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="type">Relationship Type</Label>
                                        <Select
                                            value={selectedRelationship?.type ?? ''}
                                            onValueChange={(value) => {
                                                setSelectedRelationship(prev => {
                                                    if (prev == null) {
                                                        return prev;
                                                    }
                                                    return {
                                                        ...prev,
                                                        type: value as ContactRelationshipType
                                                    }
                                                })
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type"/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.keys(ContactRelationshipTypeNameMapping).map((type) => (
                                                    <SelectItem key={type}
                                                                value={type}>{ContactRelationshipTypeNameMapping[type as ContactRelationshipType] || type}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="established">Established</Label>
                                        <Input
                                            id="established"
                                            type="date"
                                            value={selectedRelationship?.established ?? ''}
                                            onChange={(e) => {
                                                setSelectedRelationship(prev => {
                                                    if (prev == null) {
                                                        return prev;
                                                    }
                                                    return {
                                                        ...prev,
                                                        established: e.target.value
                                                    }
                                                })
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="notes">Notes</Label>
                                        <Textarea
                                            id="notes"
                                            value={selectedRelationship?.notes ?? ''}
                                            onChange={(e) => {
                                                setSelectedRelationship(prev => {
                                                    if (prev == null) {
                                                        return prev;
                                                    }
                                                    return {
                                                        ...prev,
                                                        notes: e.target.value
                                                    }
                                                })
                                            }}
                                        />
                                    </div>
                                    {(isAddingRelationship && selectedRelationship) && <div>
                                        <div className="flex flex-col space-y-2 mb-8">
                                            <Label htmlFor={'flipDirection'}>Flip Direction</Label>
                                            <Switch id={'flipDirection'} checked={flipDirection}
                                                    onCheckedChange={setFlipDirection}/>
                                        </div>
                                        {/* Relationship "preview" */}
                                        <h4 className="font-semibold mb-2">Relationship Preview</h4>
                                        <div className={'flex flex-row justify-center items-center'}>
                                            {flipDirection ?
                                                <RelationshipAvatar name={selectedRelationship.contact?.fullName}
                                                                    type={selectedRelationship.contact?.type ?? null}/> :
                                                <RelationshipAvatar name={name} type={type}/>}

                                            {/* Arrow from source to target */}
                                            <div className={'flex flex-col space-y-2 items-center'}>
                                                <ArrowRight
                                                    className={`h-10 w-10 mx-24`}/>
                                                <h5 className="text-lg font-semibold">{ContactRelationshipTypeNameMapping[selectedRelationship.type!] ?? 'Unspecified'}</h5>
                                            </div>

                                            {flipDirection ?
                                                <RelationshipAvatar name={name} type={type}/> :
                                                <RelationshipAvatar name={selectedRelationship.contact?.fullName}
                                                                    type={selectedRelationship.contact?.type ?? null}/>}
                                        </div>
                                    </div>}
                                    {validationMessage &&
                                        <h5 className="font-bold text-md text-red-500">{validationMessage}</h5>}
                                    <div className="flex space-x-2">
                                        <Button onClick={() => setSelectedRelationship(null)}
                                                variant={'destructive'}>Cancel</Button>
                                        <Button onClick={async () => {
                                            if (selectedRelationship == null) {
                                                return;
                                            }

                                            // Parse as Local Date
                                            const established = selectedRelationship.established ? new Date(`${selectedRelationship.established}T00:00:00`) : undefined;

                                            // Update row in table
                                            setSelectedRelationship(null)
                                            let _prev: Relationship | undefined = undefined
                                            if (isAddingRelationship) {
                                                setLoadedLinks((prev) => {
                                                    const source = flipDirection ? selectedRelationship.contact!.guid : selectedRelationship.id;
                                                    const target = flipDirection ? selectedRelationship.id : selectedRelationship.contact!.guid;
                                                    return [...prev, {
                                                        relationId: selectedRelationship.relationId,
                                                        source,
                                                        target,
                                                        type: selectedRelationship.type!,
                                                        established: established,
                                                        notes: selectedRelationship.notes
                                                    }];
                                                })

                                                setLoadedNodes((prev) => {
                                                    return [...prev, {
                                                        key: selectedRelationship.contact!.guid,
                                                        name: selectedRelationship.contact!.fullName,
                                                        type: selectedRelationship.contact!.type
                                                    }];
                                                })
                                            } else {
                                                setLoadedLinks((prev) => {
                                                    const newLinks = [...prev];
                                                    _prev = newLinks[selectedRelationship.linkIdx]
                                                    newLinks[selectedRelationship.linkIdx] = {
                                                        ...newLinks[selectedRelationship.linkIdx],
                                                        type: selectedRelationship.type!,
                                                        established: established,
                                                        notes: selectedRelationship.notes,
                                                        target: selectedRelationship.targetId
                                                    }
                                                    return newLinks;
                                                })
                                            }

                                            if (selectedRelationship.contact == null) {
                                                toast.error(`You must select a contact to relate ${selectedRelationship.name} to.`);
                                                return;
                                            }

                                            if (selectedRelationship.type == null) {
                                                toast.error(`You must select a relationship type to relate ${selectedRelationship.name} to.`);
                                                return;
                                            }

                                            if (isAddingRelationship) {
                                                const originId = flipDirection ? selectedRelationship.contact.guid : id;
                                                const targetId = flipDirection ? id : selectedRelationship.contact.guid;
                                                const result = handleServerAction(await createRelationship(originId, targetId, selectedRelationship.type as ContactRelationshipType, established, selectedRelationship.notes));
                                                if (!result.success) {
                                                    setLoadedLinks((prev) => {
                                                        let newLinks = [...prev];
                                                        if (_prev != null) {
                                                            newLinks = newLinks.filter(link => link.target !== targetId && link.source !== originId);
                                                        }
                                                        return newLinks;
                                                    });

                                                    setLoadedNodes((prev) => {
                                                        return [...prev].filter(node => node.key !== selectedRelationship.contact!.guid);
                                                    });
                                                }
                                            } else {
                                                const result = handleServerAction(await updateRelationship(selectedRelationship.id, selectedRelationship.relationId,selectedRelationship.targetId, selectedRelationship.type as ContactRelationshipType, established, selectedRelationship.notes, selectedRelationship.contact.guid));
                                                if (!result.success) {
                                                    setLoadedLinks((prev) => {
                                                        const newLinks = [...prev];
                                                        if (_prev != null) {
                                                            const idx = newLinks.findIndex(link => link.target === selectedRelationship.targetId && link.source === selectedRelationship.id);
                                                            if (idx !== -1) {
                                                                newLinks[idx] = _prev;
                                                            }
                                                        }
                                                        return newLinks;
                                                    });
                                                }
                                            }
                                        }}>{isAddingRelationship ? 'Create' : 'Save'}</Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        {confirmation}
                    </TabsContent>
                    <TabsContent value="visual">
                        <div className="flex flex-col items-center space-y-8">
                            {forceGraph}
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    </TabsContent>
}

function RelationshipAvatar({name, type}: { name?: string, type: ContactType | null }) {
    return <div className="flex flex-col space-y-2 items-center">
        <Avatar className="h-10 w-10">
            <AvatarFallback>
                {type === ContactType.INDIVIDUAL &&
                    <UserCircle className="h-4/5 w-4/5 text-primary"/>}
                {type === ContactType.HOUSEHOLD &&
                    <House className="h-4/5 w-4/5 text-primary"/>}
                {type === ContactType.COMPANY &&
                    <Building className="h-4/5 w-4/5 text-primary"/>}
                {type == null &&
                    <CircleHelp className="h-4/5 w-4/5 text-primary"/>}
            </AvatarFallback>
        </Avatar>
        <h5 className="text-lg font-semibold">{name ?? 'Unspecified'}</h5>
    </div>
}