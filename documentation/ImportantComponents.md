# Important Components

This document describes how to use 2 important components: The data table and the picker.

## [DataTable](../src/components/data/DataTable.tsx)

The data table is a typesafe, scrollable, paging, and automatically formatted/populated table that is used for displaying data.

### Overview of Properties

| Property          | Required                          | Type                                                                        | Description                                                                                               |
|-------------------|-----------------------------------|-----------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| `data`            | Yes                               | T[]                                                                         | The data to display in the table                                                                          |
| `columns`         | Yes                               | DataTableColumn\<T>[]                                                       | The columns to display in the table. Gives name, key in the data object, render function, and sortability |
| `idKey`           | Yes                               | TypeKey\<T, string>. Special type for all keys that point to a string value | The key to use for the id of the row                                                                      |
| `count`           | Yes                               | number                                                                      | The total number of rows in the table                                                                     |
| `height`          | Yes                               | string                                                                      | The height of the table. Necessary for purposes of setting up a scrolling container                       |
| `expandable`      | No                                | boolean                                                                     | Whether the table has expandable rows                                                                     |
| `expandedRender`  | Yes if expandable                 | (data: T) => React.ReactNode                                                | A function to render the expanded row. Only used if expandable is true                                    |
| `pageable`        | No                                | boolean                                                                     | Whether the table has pagination                                                                          |
| `page`            | Yes if pageable                   | number                                                                      | The current page of the table. Only used if pageable is true                                              |
| `perPage`         | Yes if pageable, defaults to 25   | number                                                                      | The number of rows per page. Only used if pageable is true                                                |
| `onPageChange`    | Yes if pageable                   | (page: number) => void                                                      | A function to call when the page changes.                                                                 |
| `onPerPageChange` | Yes if pageable                   | (perPage: number) => void                                                   | A function to call when the number of rows per page changes.                                              |
| `pageSizeOptions` | No, defaults to [10, 25, 50, 100] | number[]                                                                    | The options for the number of rows per page.                                                              |
| `sortBy`          | No                                | Sort\<T>                                                                    | The sort order of the table                                                                               |
| `setSortBy`       | No                                | (sort: Sort\<T>) => void                                                    | A function to set the sort order of the table                                                             |
| `className`       | No                                | string                                                                      | The class name to apply to the table                                                                      |
| `rowClassName`    | No                                | (data: T, idx: number) => string                                            | A function to apply a class name to a row                                                                 |
| `onRowClick`      | No                                | (data: T) => void                                                           | A function to call when a row is clicked                                                                  |

Expanded type definitions are found in the [`src/components/data/DataTable.tsx`](../src/components/data/DataTable.tsx) file.

### Practical Usage

While the data table in of itself is quite simple, it is often used in a more complex way. Specifically, it is often used in combination
with React Query which has both loading, error, and data states. There is also a `NoDataTable` for when there is no data to display.

### Other Component Properties

#### NoDataTable

When data is not available, the `NoDataTable` component is used.

| Property       | Required | Type       | Description                                                                             |
|----------------|----------|------------|-----------------------------------------------------------------------------------------|
| `columns`      | Yes      | string[]   | The columns to display in the table.                                                    |
| `expandable`   | No       | boolean    | Whether the table has expandable rows. Adds another header before all the other columns |
| `dataTypeName` | Yes      | string     | The singular word for the data type you're searching for                                |
| `clearSearch`  | Yes      | () => void | A function to clear the search                                                          |
| `className`    | No       | string     | The class name to apply to the table                                                    |

#### ErroredDataTable

When React Query returns an error, the `ErroredDataTable` component is used.

| Property     | Required | Type     | Description                            |
|--------------|----------|----------|----------------------------------------|
| `columns`    | Yes      | string[] | The columns to display in the table.   |
| `message`    | Yes      | string   | The error message to display.          |
| `expandable` | No       | boolean  | Whether the table has expandable rows. |
| `className`  | No       | string   | The class name to apply to the table.  |

#### LoadingDataTable

When React Query is loading or you're in the `loading.tsx` file, the `LoadingDataTable` component is used.

| Property       | Required | Type     | Description                                                                          |
|----------------|----------|----------|--------------------------------------------------------------------------------------|
| `columns`      | Yes      | string[] | The columns to display in the table.                                                 |
| `fakeRowCount` | Yes      | number   | The number of rows to display. This is used to simulate loading data.                |
| `className`    | No       | string   | The class name to apply to the table.                                                |
| `expandable`   | No       | boolean  | Whether the table has expandable rows.                                               |
| `pageable`     | No       | boolean  | Whether the table has pagination.                                                    |
| `height`       | No       | string   | The height of the table. Necessary for purposes of setting up a scrolling container. |

### Example

```tsx
'use client';
import {LoadingDataTable} from "~/components/data/LoadingDataTable";
import {DataTable, ErroredDataTable, NoDataTable, Sort} from "~/components/data/DataTable";
import {handleServerAction} from "./APIClient";

export function TableUsageExample() {
    type User = {
        id: string
        name: string
        email: string
        phone: string
        website: string
    }
    const [page, setPage] = React.useState(1);
    const [perPage, setPerPage] = React.useState(25);
    const [sortBy, setSortBy] = React.useState<Sort<User>>()

    const {data, isLoading, error, isError} = useQuery({
        queryKey: ['table-usage-example', page, perPage],
        queryFn: async () => {
            const data = handleServerAction(await someAction(page, perPage, sortBy));
            if (!data.success) {
                throw new Error(data.message);
            }
            return data.result!;
        }
    }) // Data is of type [User[], count: number]

    let content: React.ReactNode;

    if (isLoading) {
        content = <LoadingDataTable columns={['Name', 'Email', 'Phone', 'Website']} fakeRowCount={25} pageable height={'70vh'}/>
    } else if (isError || data == null) {
        content = <ErroredDataTable columns={['Name', 'Email', 'Phone', 'Website']} message={(error as Error).message ?? 'Error while loading data'}/>
    } else {
        const [records, count] = data;

        if (count === 0) {
            content = <NoDataTable columns={['Name', 'Email', 'Phone', 'Website']} dataTypeName={'User'} clearSearch={() => {
            }}/>
        }

        content = <DataTable
            idKey={'id'}
            data={records}
            count={count}
            columns={[{
                title: 'Name',
                key: 'name',
            }, {
                title: 'Email',
                key: 'email',
                render: (value: string) => <a href={`mailto:${value}`}>{value}</a>,
            }, {
                title: 'Phone',
                key: 'phone',
                render: (value: string) => <a href={`tel:${value}`}>{value}</a>,
            }, {
                title: 'Website',
                key: 'website',
            }]}
            pageable
            page={page}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
            pageSizeOptions={[10, 25, 50, 100]}
            sortBy={sortBy}
            setSortBy={setSortBy}
            height={'70vh'}
        />
    }

    return <div>
        {content}
    </div>
} 
```

## [Picker](../src/components/data/Picker.tsx)

The picker is a component that allows user to quickly select a database record and includes a search bar.

### Overview of Properties

| Property          | Required                | Type                                                                                      | Description                                                                                                                                   |
|-------------------|-------------------------|-------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| `name`              | Yes                     | string                                                                                    | The html name of the form field                                                                                                               |
| `search`            | Yes                     | (query: string, page: number, perPage: number, sortBy: Sort<T>) => Promise<[T[], number]> | A function to search for records                                                                                                              |
| `description`       | No                      | string                                                                                    | Description in the picker dialog                                                                                                              |
| `searchPlaceholder` | No                      | string                                                                                    | Placeholder for the search input                                                                                                              |
| `className`         | No                      | string                                                                                    | Class name for the picker container                                                                                                           |
| `modalPopover`      | No                      | boolean                                                                                   | If true, the picker will be a modal and screen readers will not be able to interact with the rest of the page                                 |
| `DataTable`         | Yes                     | Essentially just the column configuration for the data table                              | Configures the datatable in the picker                                                                                                        |
| `dataTypeName`      | Yes                     | string                                                                                    | Singular word for the data type you're searching for                                                                                          |
| `trigger`           | Yes                     | See PickerTriggerProps below                                                              | Configures the trigger for the picker                                                                                                         |
| `height`            | No                      | CSSProperties['height']                                                                   | The height of the picker.                                                                                                                     |
| `index`             | No                      | number                                                                                    | The z-index of the picker (Added on top of the normal z-index.                                                                                |
| `searchKeys`        | No                      | string[]                                                                                  | An array of keys that the search function depends on. This allows React Query to re-run the query when other non-standard dependencies change | 
| `dialog`            | No                      | boolean                                                                                   | If the picker is in a dialog, pass true                                                                                                       |
| `pickerKey`         | No                      | string                                                                                    | Unique key to determine what type of picker it is. Used by React Query                                                                        |
| `useAdder`          | No                      | boolean                                                                                   | If true, the picker will have an add button which navigates to the specified adder                                                            |
| `adder`             | Yes if useAdder is true | React.ReactNode                                                                           | The node to render in the adder dialog.                                                                                                       |
| `adderHeight`       | Yes if useAdder is true | CSSProperties['height']                                                                   | The height of the adder dialog.                                                                                                               |
| `add`               | Yes if useAdder is true | () => void                                                                                | A function to call when a new record has been added.                                                                                          |
| `cancelAdd`         | Yes if useAdder is true | () => void                                                                                | A function to call when the adder dialog is closed/canceled.                                                                                  |
| `adderTitle`        | Yes if useAdder is true | string                                                                                    | The title of the adder dialog.                                                                                                                |
| `multi`             | No                      | boolean                                                                                   | If true, the picker will allow multiple records to be selected.                                                                               |
| `value`             | Yes                     | T[] if multi, otherwise T \| null                                                         | The selected record(s).                                                                                                                       |
| `onValueChange`     | Yes                     | (value: T[]) => void if multi, otherwise (value: T \| null) => void                       | A function to call when the selected record(s) change.                                                                                        |
| `maxCount`          | No                      | number                                                                                    | The maximum number of records to display in the trigger, defaults to 3.                                                                       | 

### PickerTriggerProps

The picker trigger is the actual field that displays the selected records.

| Property      | Required | Type                                                    | Description                                                                                                                          |
|---------------|----------|---------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| `nameKey`     | Yes      | TypeKey<T, string>                                      | The key to use for the name of the row                                                                                               |
| `label`       | No       | string                                                  | The label of the picker trigger                                                                                                      |
| `placeholder` | No       | string                                                  | The placeholder of the picker trigger                                                                                                |
| `variant`     | No       | "default" \| "destructive" \| "inverted" \| "secondary" | The variant of the picker trigger                                                                                                    |
| `render`      | No       | (value: T) => React.ReactNode                           | A function to render a selected record inside of the trigger. Otherwise just defaults to the record's name as defined by the nameKey |

### Example

```tsx
'use client';
import {Picker} from "~/components/data/Picker";
import {handleServerAction} from "./APIClient";

export function PickerUsageExample() {
    type User = {
        id: string
        name: string
        email: string
        phone: string
        website: string
    }
    const [page, setPage] = React.useState(1);
    const [perPage, setPerPage] = React.useState(25);
    const [sortBy, setSortBy] = React.useState<Sort<User>>()
    
    const [users, setUsers] = React.useState<User[]>([]);

    return <div>
        <Picker
            name={'Users'}
            search={async (search, page, perPage, sortBy) => {
                const data = handleServerAction(await someAction(page, perPage, sortBy));
                if (!data.success) {
                    throw new Error(data.message);
                }
                return data.result!;
            }}
            title={'Users'}
            description={'Search for users'}
            searchPlaceholder={'Search...'}
            className={'w-full'}
            datatable={{
                columns: [
                    {title: 'Name', key: 'name'},
                    {title: 'Email', key: 'email'},
                    {title: 'Phone', key: 'phone'},
                    {title: 'Website', key: 'website'},
                ],
                idKey: 'id',
            }}
            dataTypeName={'User'}
            trigger={{
                nameKey: 'name',
                placeholder: 'Pick a user...',
            }}
            multi
            value={users}
            onValueChange={setUsers}
            pickerKey={'demo-users'}
        />
    </div>
}
```