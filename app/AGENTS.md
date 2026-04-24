When creating any UI, split out new components into their own files if the original file where the component is added is becoming hundreds of lines long. Also split them out when they are logically separate.

Generic and widely reused hooks, logic, and components should be split out into their own files.

Group things by domain insterad of by file type. Eg instead of grouping by components, group by the topic such as chat.