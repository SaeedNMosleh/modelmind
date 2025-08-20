# Entity Relationship Diagram Guidelines

## Basic Principles
- Use ERDs to show data relationships and database structure
- Entities should represent distinct data objects or concepts
- Relationships show how entities connect and interact
- Attributes define the properties of each entity

## Best Practices
- Use singular entity names (e.g., "Customer" not "Customers")
- Define primary keys for all entities
- Show cardinality relationships clearly (1:1, 1:M, M:N)
- Use proper notation for entity types (strong vs. weak entities)
- Include important attributes but avoid clutter

## Styling Recommendations
- Use rectangles for entities
- Use diamonds for relationships
- Use ovals/ellipses for attributes
- Use consistent naming conventions
- Group related entities visually
- Use colors to distinguish entity types or functional areas

## Common Elements
- **Entities**: Core data objects (Customer, Order, Product)
- **Attributes**: Properties of entities (CustomerID, Name, Email)
- **Relationships**: Connections between entities (CustomerPlacesOrder)
- **Cardinality**: How many instances can relate (One-to-Many, Many-to-Many)
- **Primary Keys**: Unique identifiers (underlined attributes)
- **Foreign Keys**: References to other entities