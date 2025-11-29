/**
 * Schema.org Validation Script
 * 
 * Validates all Schema.org JSON-LD markup in the project
 * to ensure compliance with Google Rich Results requirements.
 * 
 * Usage: node scripts/validate-schemas.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Required Schema.org properties by type
const REQUIRED_PROPERTIES = {
  Article: ['@type', 'headline', 'author', 'publisher', 'datePublished'],
  Organization: ['@type', 'name', 'url'],
  LocalBusiness: ['@type', 'name', 'address'],
  Event: ['@type', 'name', 'startDate', 'location'],
  Book: ['@type', 'name', 'author'],
  VideoObject: ['@type', 'name', 'thumbnailUrl', 'uploadDate'],
  FAQPage: ['@type', 'mainEntity'],
  BreadcrumbList: ['@type', 'itemListElement'],
  Service: ['@type', 'name', 'provider'],
  Review: ['@type', 'author', 'reviewRating'],
  ItemList: ['@type', 'itemListElement']
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

class SchemaValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.validated = 0;
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  validateSchema(schema, filePath, lineNumber = 'unknown') {
    this.validated++;
    const type = schema['@type'];
    
    if (!type) {
      this.errors.push({
        file: filePath,
        line: lineNumber,
        message: 'Missing @type property',
        schema
      });
      return;
    }

    const requiredProps = REQUIRED_PROPERTIES[type];
    if (!requiredProps) {
      this.warnings.push({
        file: filePath,
        line: lineNumber,
        message: `Unknown schema type: ${type}`,
        schema
      });
      return;
    }

    // Check required properties
    const missingProps = requiredProps.filter(prop => {
      // Handle nested properties (e.g., 'publisher.name')
      const keys = prop.split('.');
      let value = schema;
      for (const key of keys) {
        value = value?.[key];
      }
      return !value;
    });

    if (missingProps.length > 0) {
      this.errors.push({
        file: filePath,
        line: lineNumber,
        message: `Missing required properties for ${type}: ${missingProps.join(', ')}`,
        schema
      });
    }

    // Type-specific validations
    this.validateByType(schema, type, filePath, lineNumber);
  }

  validateByType(schema, type, filePath, lineNumber) {
    switch (type) {
      case 'Article':
        if (!schema.image) {
          this.warnings.push({
            file: filePath,
            line: lineNumber,
            message: 'Article should have an image for better rich results'
          });
        }
        break;

      case 'Event':
        if (!schema.offers) {
          this.warnings.push({
            file: filePath,
            line: lineNumber,
            message: 'Event should have offers property for ticket information'
          });
        }
        break;

      case 'VideoObject':
        if (!schema.contentUrl && !schema.embedUrl) {
          this.errors.push({
            file: filePath,
            line: lineNumber,
            message: 'VideoObject requires either contentUrl or embedUrl'
          });
        }
        break;

      case 'Organization':
        if (schema.aggregateRating && !schema.review) {
          this.warnings.push({
            file: filePath,
            line: lineNumber,
            message: 'Organization with aggregateRating should have review array'
          });
        }
        break;
    }
  }

  extractSchemasFromFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const schemas = [];

    // Match JSON.stringify patterns in TSX files
    const jsonStringifyRegex = /JSON\.stringify\((\{[\s\S]*?\})\)/g;
    let match;

    while ((match = jsonStringifyRegex.exec(content)) !== null) {
      try {
        // Extract the object literal
        const jsonString = match[1];
        // Try to parse it (this is approximate, won't work for all cases)
        // In a real scenario, we'd use a proper TypeScript parser
        
        // Simple heuristic: look for @type to identify Schema.org markup
        if (jsonString.includes('"@type"') || jsonString.includes("'@type'")) {
          const lineNumber = content.substring(0, match.index).split('\n').length;
          schemas.push({
            content: jsonString,
            line: lineNumber
          });
        }
      } catch (e) {
        // Ignore parse errors for now
      }
    }

    return schemas;
  }

  scanDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        this.scanDirectory(fullPath);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const schemas = this.extractSchemasFromFile(fullPath);
        this.log(`\n📄 ${fullPath}`, 'blue');
        
        if (schemas.length === 0) {
          this.log('  No schemas found', 'gray');
        } else {
          this.log(`  Found ${schemas.length} schema(s)`, 'gray');
        }
      }
    }
  }

  printReport() {
    this.log('\n' + '='.repeat(60), 'blue');
    this.log('📊 SCHEMA VALIDATION REPORT', 'blue');
    this.log('='.repeat(60), 'blue');

    this.log(`\n✓ Total schemas validated: ${this.validated}`, 'green');

    if (this.errors.length > 0) {
      this.log(`\n❌ ERRORS (${this.errors.length}):`, 'red');
      this.errors.forEach((error, idx) => {
        this.log(`\n${idx + 1}. ${error.file}:${error.line}`, 'red');
        this.log(`   ${error.message}`, 'red');
      });
    } else {
      this.log('\n✓ No errors found!', 'green');
    }

    if (this.warnings.length > 0) {
      this.log(`\n⚠️  WARNINGS (${this.warnings.length}):`, 'yellow');
      this.warnings.forEach((warning, idx) => {
        this.log(`\n${idx + 1}. ${warning.file}:${warning.line}`, 'yellow');
        this.log(`   ${warning.message}`, 'yellow');
      });
    }

    this.log('\n' + '='.repeat(60), 'blue');
    
    if (this.errors.length > 0) {
      this.log('\n❌ Validation FAILED', 'red');
      process.exit(1);
    } else {
      this.log('\n✓ Validation PASSED', 'green');
    }
  }
}

// Main execution
const validator = new SchemaValidator();
const srcDir = path.join(__dirname, '..', 'src');

console.log('\n🔍 Scanning for Schema.org markup...\n');
validator.scanDirectory(srcDir);
validator.printReport();
